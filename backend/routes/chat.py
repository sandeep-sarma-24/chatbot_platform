import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId

from db import chats_col, projects_col, prompts_col, files_col
from middleware import token_required
from services import build_system_content, call_llm

chat_bp = Blueprint('chat', __name__)

DEFAULT_TITLE = 'New conversation'


def _utcnow():
    return datetime.now(timezone.utc)


def _generate_title(message):
    message = message.strip()
    if len(message) <= 50:
        return message
    return message[:50] + '...'


def _iso(dt):
    return dt.isoformat() if dt else None


def _conversation_id(chat):
    return chat.get('conversationId') or str(chat['_id'])


def serialize_conversation_summary(chat):
    messages = chat.get('messages', [])
    return {
        'id': _conversation_id(chat),
        'title': chat.get('title') or DEFAULT_TITLE,
        'createdAt': _iso(chat.get('createdAt')),
        'updatedAt': _iso(chat.get('updatedAt') or chat.get('createdAt')),
        'messageCount': len(messages),
    }


def serialize_conversation_full(chat):
    data = serialize_conversation_summary(chat)
    data['messages'] = chat.get('messages', [])
    return data


def serialize_chat(chat):
    if not chat:
        return {'messages': []}
    return {
        '_id': str(chat['_id']),
        'project': str(chat['project']),
        'user': str(chat['user']),
        'messages': chat.get('messages', []),
    }


def _validate_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return None, (jsonify({'message': 'Invalid project ID'}), 400)

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return None, (jsonify({'message': 'Project not found'}), 404)

    return project, None


def _load_project_context(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return None, None, None, None, (jsonify({'message': 'Invalid project ID'}), 400)

    with ThreadPoolExecutor(max_workers=4) as executor:
        project_future = executor.submit(
            projects_col.find_one, {'_id': oid, 'user': request.user_id}
        )
        prompts_future = executor.submit(
            lambda: list(prompts_col.find(
                {'project': project_id},
                {'title': 1, 'content': 1},
            ))
        )
        files_future = executor.submit(
            lambda: list(files_col.find(
                {'project': project_id, 'content': {'$ne': ''}},
                {'originalName': 1, 'content': 1},
            ))
        )
        project = project_future.result()
        prompts = prompts_future.result()
        files = files_future.result()

    if not project:
        return None, None, None, None, (jsonify({'message': 'Project not found'}), 404)

    return project, prompts, files, oid, None


def _get_most_recent_conversation(project_id, user_id):
    chat = chats_col.find_one(
        {
            'project': project_id,
            'user': user_id,
            'conversationId': {'$exists': True},
        },
        sort=[('updatedAt', -1)],
    )
    if chat:
        return chat

    return chats_col.find_one({
        'project': project_id,
        'user': user_id,
        'conversationId': {'$exists': False},
    })


def _get_conversation(project_id, user_id, conversation_id):
    chat = chats_col.find_one({
        'project': project_id,
        'user': user_id,
        'conversationId': conversation_id,
    })
    if chat:
        return chat

    try:
        oid = ObjectId(conversation_id)
    except InvalidId:
        return None

    return chats_col.find_one({
        '_id': oid,
        'project': project_id,
        'user': user_id,
    })


def _new_conversation_doc(project_id, user_id, title=None):
    now = _utcnow()
    return {
        'project': project_id,
        'user': user_id,
        'conversationId': str(uuid.uuid4()),
        'title': (title or DEFAULT_TITLE).strip() or DEFAULT_TITLE,
        'createdAt': now,
        'updatedAt': now,
        'messages': [],
    }


def _should_auto_title(chat, message):
    if chat.get('messages'):
        return False
    current_title = (chat.get('title') or DEFAULT_TITLE).strip()
    return not current_title or current_title == DEFAULT_TITLE


def _send_message_to_conversation(chat, project, prompts, files, message):
    system_content = build_system_content(project, prompts, files)

    llm_messages = [{'role': 'system', 'content': system_content}]
    llm_messages += chat.get('messages', [])[-20:]
    llm_messages.append({'role': 'user', 'content': message})

    assistant_reply, err = call_llm(llm_messages)
    if err:
        return None, err

    now = _utcnow()
    update = {
        '$push': {
            'messages': {
                '$each': [
                    {'role': 'user', 'content': message},
                    {'role': 'assistant', 'content': assistant_reply},
                ]
            }
        },
        '$set': {'updatedAt': now},
    }

    if _should_auto_title(chat, message):
        update['$set']['title'] = _generate_title(message)

    chats_col.update_one({'_id': chat['_id']}, update)

    chat['messages'] = chat.get('messages', []) + [
        {'role': 'user', 'content': message},
        {'role': 'assistant', 'content': assistant_reply},
    ]
    chat['updatedAt'] = now
    if 'title' in update['$set']:
        chat['title'] = update['$set']['title']

    return assistant_reply, None


# --- Multi-conversation routes ---


@chat_bp.route('/<project_id>/conversations', methods=['GET'])
@token_required
def list_conversations(project_id):
    project, error = _validate_project(project_id)
    if error:
        return error

    chats = chats_col.find(
        {'project': project_id, 'user': request.user_id},
    ).sort([('updatedAt', -1), ('createdAt', -1)])

    return jsonify([serialize_conversation_summary(chat) for chat in chats])


@chat_bp.route('/<project_id>/conversations', methods=['POST'])
@token_required
def create_conversation(project_id):
    project, error = _validate_project(project_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    title = data.get('title', '').strip() or None

    chat = _new_conversation_doc(project_id, request.user_id, title=title)
    result = chats_col.insert_one(chat)
    chat['_id'] = result.inserted_id

    return jsonify(serialize_conversation_full(chat)), 201


@chat_bp.route('/<project_id>/conversations/<conversation_id>', methods=['GET'])
@token_required
def get_conversation(project_id, conversation_id):
    project, error = _validate_project(project_id)
    if error:
        return error

    chat = _get_conversation(project_id, request.user_id, conversation_id)
    if not chat:
        return jsonify({'message': 'Conversation not found'}), 404

    return jsonify(serialize_conversation_full(chat))


@chat_bp.route('/<project_id>/conversations/<conversation_id>', methods=['POST'])
@token_required
def send_conversation_message(project_id, conversation_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'message': 'Message is required'}), 400

    project, prompts, files, _, error = _load_project_context(project_id)
    if error:
        return error

    chat = _get_conversation(project_id, request.user_id, conversation_id)
    if not chat:
        return jsonify({'message': 'Conversation not found'}), 404

    assistant_reply, err = _send_message_to_conversation(
        chat, project, prompts, files, message
    )
    if err:
        error_message, status_code = err
        return jsonify({'message': error_message}), status_code

    return jsonify({
        'reply': assistant_reply,
        'conversation': serialize_conversation_full(chat),
    })


@chat_bp.route('/<project_id>/conversations/<conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(project_id, conversation_id):
    project, error = _validate_project(project_id)
    if error:
        return error

    chat = _get_conversation(project_id, request.user_id, conversation_id)
    if not chat:
        return jsonify({'message': 'Conversation not found'}), 404

    chats_col.delete_one({'_id': chat['_id']})
    return jsonify({'message': 'Conversation deleted'})


@chat_bp.route('/<project_id>/conversations/<conversation_id>', methods=['PATCH'])
@token_required
def rename_conversation(project_id, conversation_id):
    project, error = _validate_project(project_id)
    if error:
        return error

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'message': 'Title is required'}), 400

    chat = _get_conversation(project_id, request.user_id, conversation_id)
    if not chat:
        return jsonify({'message': 'Conversation not found'}), 404

    now = _utcnow()
    chats_col.update_one(
        {'_id': chat['_id']},
        {'$set': {'title': title, 'updatedAt': now}},
    )
    chat['title'] = title
    chat['updatedAt'] = now

    return jsonify(serialize_conversation_full(chat))


# --- Legacy routes (backward compatible) ---


@chat_bp.route('/<project_id>', methods=['GET'])
@token_required
def get_chat(project_id):
    chat = _get_most_recent_conversation(project_id, request.user_id)
    return jsonify(serialize_chat(chat))


@chat_bp.route('/<project_id>', methods=['POST'])
@token_required
def send_message(project_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'message': 'Message is required'}), 400

    project, prompts, files, _, error = _load_project_context(project_id)
    if error:
        return error

    chat = _get_most_recent_conversation(project_id, request.user_id)
    if not chat:
        chat = _new_conversation_doc(project_id, request.user_id)
        result = chats_col.insert_one(chat)
        chat['_id'] = result.inserted_id

    assistant_reply, err = _send_message_to_conversation(
        chat, project, prompts, files, message
    )
    if err:
        error_message, status_code = err
        return jsonify({'message': error_message}), status_code

    return jsonify({'reply': assistant_reply, 'chat': serialize_chat(chat)})


@chat_bp.route('/<project_id>', methods=['DELETE'])
@token_required
def clear_chat(project_id):
    chat = _get_most_recent_conversation(project_id, request.user_id)
    if chat:
        chats_col.delete_one({'_id': chat['_id']})
    return jsonify({'message': 'Chat cleared'})
