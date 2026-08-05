from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt

from db import users_col
from config import Config
from middleware import token_required

auth_bp = Blueprint('auth', __name__)


def serialize_user(user):
    return {
        '_id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'createdAt': user.get('createdAt', '').isoformat() if user.get('createdAt') else None
    }


def create_token(user_id):
    payload = {
        'userId': str(user_id),
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'message': 'Name, email, and password are required'}), 400
    if len(name) > 100 or len(email) > 254:
        return jsonify({'message': 'Input too long'}), 400
    if len(password) < 6 or len(password) > 128:
        return jsonify({'message': 'Password must be 6-128 characters'}), 400

    if users_col.find_one({'email': email}):
        return jsonify({'message': 'User already exists with this email'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10))

    user = {
        'name': name,
        'email': email,
        'password': hashed,
        'createdAt': datetime.now(timezone.utc)
    }
    result = users_col.insert_one(user)
    user['_id'] = result.inserted_id

    token = create_token(user['_id'])
    return jsonify({'token': token, 'user': serialize_user(user)}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400

    user = users_col.find_one({'email': email})
    if not user:
        return jsonify({'message': 'Invalid credentials'}), 400

    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({'message': 'Invalid credentials'}), 400

    token = create_token(user['_id'])
    return jsonify({'token': token, 'user': serialize_user(user)})


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    try:
        oid = ObjectId(request.user_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    user = users_col.find_one({'_id': oid})
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(serialize_user(user))
