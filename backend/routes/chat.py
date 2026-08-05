from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId

from db import chats_col, projects_col, prompts_col, files_col
from middleware import token_required
from services import build_system_content, call_llm

chat_bp = Blueprint('chat', __name__)


def serialize_chat(chat):
    if not chat:
        return {'messages': []}
    return {
        '_id': str(chat['_id']),
        'project': str(chat['project']),
        'user': str(chat['user']),
        'messages': chat.get('messages', [])
    }


@chat_bp.route('/<project_id>', methods=['GET'])
@token_required
def get_chat(project_id):
    chat = chats_col.find_one({'project': project_id, 'user': request.user_id})
    return jsonify(serialize_chat(chat))


@chat_bp.route('/<project_id>', methods=['POST'])
@token_required
def send_message(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid project ID'}), 400

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'message': 'Message is required'}), 400

    with ThreadPoolExecutor(max_workers=4) as executor:
        project_future = executor.submit(
            projects_col.find_one, {'_id': oid, 'user': request.user_id}
        )
        chat_future = executor.submit(
            chats_col.find_one, {'project': project_id, 'user': request.user_id}
        )
        prompts_future = executor.submit(
            lambda: list(prompts_col.find(
                {'project': project_id},
                {'title': 1, 'content': 1}
            ))
        )
        files_future = executor.submit(
            lambda: list(files_col.find(
                {'project': project_id, 'content': {'$ne': ''}},
                {'originalName': 1, 'content': 1}
            ))
        )
        project = project_future.result()
        chat = chat_future.result()
        prompts = prompts_future.result()
        files = files_future.result()

    if not project:
        return jsonify({'message': 'Project not found'}), 404

    if not chat:
        chat = {'project': project_id, 'user': request.user_id, 'messages': []}
        result = chats_col.insert_one(chat)
        chat['_id'] = result.inserted_id

    system_content = build_system_content(project, prompts, files)

    llm_messages = [{'role': 'system', 'content': system_content}]
    llm_messages += chat.get('messages', [])[-20:]
    llm_messages.append({'role': 'user', 'content': message})

    assistant_reply, err = call_llm(llm_messages)
    if err:
        error_message, status_code = err
        return jsonify({'message': error_message}), status_code

    chats_col.update_one(
        {'_id': chat['_id']},
        {'$push': {'messages': {'$each': [
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': assistant_reply}
        ]}}}
    )

    chat['messages'] = chat.get('messages', []) + [
        {'role': 'user', 'content': message},
        {'role': 'assistant', 'content': assistant_reply}
    ]
    return jsonify({'reply': assistant_reply, 'chat': serialize_chat(chat)})


@chat_bp.route('/<project_id>', methods=['DELETE'])
@token_required
def clear_chat(project_id):
    chats_col.find_one_and_delete({'project': project_id, 'user': request.user_id})
    return jsonify({'message': 'Chat cleared'})
