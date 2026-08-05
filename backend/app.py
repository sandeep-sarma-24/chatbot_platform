import logging
import time

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from routes.auth import auth_bp
from routes.projects import projects_bp
from routes.prompts import prompts_bp
from routes.chat import chat_bp
from routes.files import files_bp
from routes.embed import embed_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('api')

app = Flask(__name__)
app.url_map.strict_slashes = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

CORS(app, resources={
    r'/api/*': {'origins': '*'},
    r'/embed/*': {'origins': '*'}
})

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=['200 per minute'],
    storage_uri='memory://',
)


@app.before_request
def _start_timer():
    g.start = time.perf_counter()


@app.after_request
def _security_headers(response):
    ms = (time.perf_counter() - g.start) * 1000
    log.info('%s %s %s (%.0fms)', request.method, request.path, response.status_code, ms)

    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

    if not request.path.startswith('/embed'):
        response.headers['X-Frame-Options'] = 'DENY'

    return response


@app.errorhandler(429)
def _rate_limit_exceeded(e):
    return jsonify({'message': 'Rate limit exceeded. Please slow down.'}), 429


@app.errorhandler(413)
def _request_too_large(e):
    return jsonify({'message': 'Request too large (max 16MB).'}), 413


app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(projects_bp, url_prefix='/api/projects')
app.register_blueprint(prompts_bp, url_prefix='/api/prompts')
app.register_blueprint(chat_bp, url_prefix='/api/chat')
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(embed_bp)

limiter.limit('10 per minute')(auth_bp)
limiter.limit('30 per minute')(chat_bp)
limiter.limit('10 per minute')(files_bp)
limiter.limit('20 per minute')(embed_bp)


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=Config.PORT, debug=True)
