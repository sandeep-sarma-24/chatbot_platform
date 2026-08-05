import uuid

from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from db import projects_col
from middleware import token_required

projects_bp = Blueprint('projects', __name__)


def serialize_project(project):
    return {
        '_id': str(project['_id']),
        'name': project['name'],
        'description': project.get('description', ''),
        'systemPrompt': project.get('systemPrompt', 'You are a helpful assistant.'),
        'apiKey': project.get('apiKey', ''),
        'user': str(project['user']),
        'createdAt': project.get('createdAt', '').isoformat() if project.get('createdAt') else None,
        'updatedAt': project.get('updatedAt', '').isoformat() if project.get('updatedAt') else None
    }


@projects_bp.route('/', methods=['GET'])
@token_required
def list_projects():
    projects = projects_col.find({'user': request.user_id}).sort('createdAt', -1)
    return jsonify([serialize_project(p) for p in projects])


@projects_bp.route('/', methods=['POST'])
@token_required
def create_project():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    name = data.get('name', '').strip()

    if not name:
        return jsonify({'message': 'Project name is required'}), 400

    project = {
        'name': name,
        'description': data.get('description', ''),
        'systemPrompt': data.get('systemPrompt', 'You are a helpful assistant.'),
        'apiKey': str(uuid.uuid4()),
        'user': request.user_id,
        'createdAt': datetime.now(timezone.utc),
        'updatedAt': datetime.now(timezone.utc)
    }
    result = projects_col.insert_one(project)
    project['_id'] = result.inserted_id
    return jsonify(serialize_project(project)), 201


@projects_bp.route('/<project_id>', methods=['GET'])
@token_required
def get_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return jsonify({'message': 'Project not found'}), 404
    return jsonify(serialize_project(project))


@projects_bp.route('/<project_id>', methods=['PUT'])
@token_required
def update_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    update = {'updatedAt': datetime.now(timezone.utc)}

    if 'name' in data:
        update['name'] = data['name']
    if 'description' in data:
        update['description'] = data['description']
    if 'systemPrompt' in data:
        update['systemPrompt'] = data['systemPrompt']

    result = projects_col.find_one_and_update(
        {'_id': oid, 'user': request.user_id},
        {'$set': update},
        return_document=True
    )
    if not result:
        return jsonify({'message': 'Project not found'}), 404
    return jsonify(serialize_project(result))


@projects_bp.route('/<project_id>', methods=['DELETE'])
@token_required
def delete_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    result = projects_col.find_one_and_delete({'_id': oid, 'user': request.user_id})
    if not result:
        return jsonify({'message': 'Project not found'}), 404
    return jsonify({'message': 'Project deleted'})


@projects_bp.route('/<project_id>/regenerate-key', methods=['POST'])
@token_required
def regenerate_api_key(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    new_key = str(uuid.uuid4())
    result = projects_col.find_one_and_update(
        {'_id': oid, 'user': request.user_id},
        {'$set': {'apiKey': new_key, 'updatedAt': datetime.now(timezone.utc)}},
        return_document=True
    )
    if not result:
        return jsonify({'message': 'Project not found'}), 404
    return jsonify(serialize_project(result))
