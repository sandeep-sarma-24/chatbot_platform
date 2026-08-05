import os
import csv
import json
import logging
from io import StringIO

from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from werkzeug.utils import secure_filename

from datetime import datetime, timezone

from db import projects_col, files_col
from config import Config
from middleware import token_required

log = logging.getLogger('api.files')
files_bp = Blueprint('files', __name__)

ALLOWED_EXTENSIONS = {'.txt', '.pdf', '.json', '.csv', '.md'}


def _extract_text(filepath, ext):
    try:
        if ext == '.pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            pages = [p.extract_text() or '' for p in reader.pages]
            return '\n'.join(pages).strip(), None
        if ext in ('.txt', '.md'):
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                return f.read().strip(), None
        if ext == '.json':
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return json.dumps(data, indent=2, ensure_ascii=False), None
        if ext == '.csv':
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f)
                rows = list(reader)
            buf = StringIO()
            for row in rows:
                buf.write(' | '.join(row) + '\n')
            return buf.getvalue().strip(), None
    except Exception as e:
        log.warning('Text extraction failed for %s: %s', filepath, e)
        return '', str(e)
    return '', 'Unsupported file type'


def serialize_file(f):
    return {
        '_id': str(f['_id']),
        'filename': f['filename'],
        'originalName': f['originalName'],
        'size': f['size'],
        'project': str(f['project']),
        'hasContent': bool(f.get('content')),
        'contentLength': len(f.get('content', '')),
        'createdAt': f.get('createdAt', '').isoformat() if f.get('createdAt') else None
    }


@files_bp.route('/<project_id>', methods=['GET'])
@token_required
def list_files(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return jsonify({'message': 'Project not found'}), 404
    files = files_col.find({'project': project_id}, {'content': 0}).sort('createdAt', -1)
    return jsonify([serialize_file(f) for f in files])


@files_bp.route('/<project_id>', methods=['POST'])
@token_required
def upload_file(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    project = projects_col.find_one({'_id': oid, 'user': request.user_id})
    if not project:
        return jsonify({'message': 'Project not found'}), 404

    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'message': f'File type not supported. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    filename = secure_filename(f"{project_id}_{file.filename}")
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    file.save(filepath)

    file_size = os.path.getsize(filepath)
    if file_size > Config.MAX_FILE_SIZE:
        os.remove(filepath)
        return jsonify({'message': 'File too large (max 10MB)'}), 400

    content, extract_err = _extract_text(filepath, ext)
    log.info('Uploaded %s (%d bytes, extracted %d chars)', file.filename, file_size, len(content))
    if extract_err:
        log.warning('Extraction issue for %s: %s', file.filename, extract_err)

    doc = {
        'filename': filename,
        'originalName': file.filename,
        'size': file_size,
        'project': project_id,
        'user': request.user_id,
        'content': content,
        'createdAt': datetime.now(timezone.utc)
    }
    result = files_col.insert_one(doc)
    doc['_id'] = result.inserted_id

    return jsonify({
        'message': 'File uploaded and processed',
        'file': serialize_file(doc)
    }), 201


@files_bp.route('/delete/<file_id>', methods=['DELETE'])
@token_required
def delete_file(file_id):
    try:
        oid = ObjectId(file_id)
    except InvalidId:
        return jsonify({'message': 'Invalid ID'}), 400

    f = files_col.find_one_and_delete({'_id': oid, 'user': request.user_id})
    if not f:
        return jsonify({'message': 'File not found'}), 404
    filepath = os.path.join(Config.UPLOAD_FOLDER, f['filename'])
    if os.path.exists(filepath):
        os.remove(filepath)
    return jsonify({'message': 'File deleted'})
