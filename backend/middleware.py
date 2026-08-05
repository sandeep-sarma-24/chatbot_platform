from functools import wraps
from flask import request, jsonify
import jwt
from bson import ObjectId
from bson.errors import InvalidId

from config import Config


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')

        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if not token:
            return jsonify({'message': 'No token, authorization denied'}), 401

        try:
            decoded = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
            request.user_id = decoded['userId']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is not valid'}), 401

        return f(*args, **kwargs)

    return decorated


def api_key_required(f):
    @wraps(f)
    def decorated(project_id, *args, **kwargs):
        from db import projects_col

        api_key = request.headers.get('X-API-Key', '')
        if not api_key:
            return jsonify({'message': 'API key required'}), 401

        try:
            oid = ObjectId(project_id)
        except InvalidId:
            return jsonify({'message': 'Invalid ID'}), 400

        project = projects_col.find_one({
            '_id': oid,
            'apiKey': api_key
        })
        if not project:
            return jsonify({'message': 'Invalid API key'}), 403

        request.project = project
        return f(project_id, *args, **kwargs)

    return decorated
