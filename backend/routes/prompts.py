from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from db import prompts_col, projects_col
from middleware import token_required

prompts_bp = Blueprint('prompts', __name__)


def serialize_prompt(prompt):
    return {
        '_id': str(prompt['_id']),
        'title': prompt['title'],
        'content': prompt['content'],
        'project': str(prompt['project']),
        'user': str(prompt['user']),
        'createdAt': prompt.get('createdAt', '').isoformat() if prompt.get('createdAt') else None
    }


@prompts_bp.route('/<project_id>', methods=['GET'])
@token_required
def list_prompts(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return jsonify({'message': 'Project not found'}), 404

    prompts = prompts_col.find({'project': project_id}).sort('createdAt', -1)
    return jsonify([serialize_prompt(p) for p in prompts])


@prompts_bp.route('/<project_id>', methods=['POST'])
@token_required
def create_prompt(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return jsonify({'message': 'Project not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    title = data.get('title', '').strip()
    content = data.get('content', '').strip()

    if not title or not content:
        return jsonify({'message': 'Title and content are required'}), 400

    prompt = {
        'title': title,
        'content': content,
        'project': project_id,
        'user': request.user_id,
        'createdAt': datetime.now(timezone.utc)
    }
    result = prompts_col.insert_one(prompt)
    prompt['_id'] = result.inserted_id
    return jsonify(serialize_prompt(prompt)), 201


@prompts_bp.route('/<prompt_id>', methods=['PUT'])
@token_required
def update_prompt(prompt_id):
    try:
        oid = ObjectId(prompt_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    update = {}
    if 'title' in data:
        update['title'] = data['title']
    if 'content' in data:
        update['content'] = data['content']

    result = prompts_col.find_one_and_update(
        {'_id': oid, 'user': request.user_id},
        {'$set': update},
        return_document=True
    )
    if not result:
        return jsonify({'message': 'Prompt not found'}), 404
    return jsonify(serialize_prompt(result))


@prompts_bp.route('/<prompt_id>', methods=['DELETE'])
@token_required
def delete_prompt(prompt_id):
    try:
        oid = ObjectId(prompt_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    result = prompts_col.find_one_and_delete({'_id': oid, 'user': request.user_id})
    if not result:
        return jsonify({'message': 'Prompt not found'}), 404
    return jsonify({'message': 'Prompt deleted'})
