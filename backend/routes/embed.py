import uuid
from concurrent.futures import ThreadPoolExecutor

from flask import Blueprint, request, jsonify, make_response
from bson import ObjectId
from bson.errors import InvalidId

from db import projects_col, prompts_col, files_col, chats_col
from middleware import api_key_required
from services import build_system_content, call_llm

embed_bp = Blueprint('embed', __name__)


@embed_bp.route('/api/embed/chat/<project_id>', methods=['POST'])
@api_key_required
def public_chat(project_id):
    try:
        ObjectId(project_id)
    except InvalidId:
        return jsonify({'message': 'Invalid project ID'}), 400

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': 'JSON body required'}), 400

    message = data.get('message', '').strip()
    if not message or len(message) > 4000:
        return jsonify({'message': 'Message required (max 4000 chars)'}), 400

    session_id = data.get('sessionId', str(uuid.uuid4()))
    project = request.project

    chat_key = {'project': project_id, 'sessionId': session_id}

    with ThreadPoolExecutor(max_workers=3) as executor:
        chat_future = executor.submit(chats_col.find_one, chat_key)
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
        chat = chat_future.result()
        prompts = prompts_future.result()
        files = files_future.result()

    if not chat:
        chat = {**chat_key, 'user': '__embed__', 'messages': []}
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

    return jsonify({
        'reply': assistant_reply,
        'sessionId': session_id
    })


@embed_bp.route('/embed/<project_id>', methods=['GET'])
def embed_widget(project_id):
    api_key = request.args.get('key', '')
    project = projects_col.find_one({'_id': ObjectId(project_id), 'apiKey': api_key}) if api_key else None
    title = project['name'] if project else 'Chat'

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Inter', -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; height: 100vh; display: flex; flex-direction: column; }}
.header {{ padding: 12px 16px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; gap: 10px; background: #111; }}
.header .dot {{ width: 10px; height: 10px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 8px #00ff8866; }}
.header h1 {{ font-size: 14px; font-weight: 600; color: #fff; }}
.messages {{ flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }}
.messages::-webkit-scrollbar {{ width: 4px; }}
.messages::-webkit-scrollbar-thumb {{ background: #333; border-radius: 2px; }}
.msg {{ max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; animation: fadeIn 0.2s ease; }}
.msg.user {{ align-self: flex-end; background: #00ff88; color: #0a0a0a; border-bottom-right-radius: 4px; font-weight: 500; }}
.msg.bot {{ align-self: flex-start; background: #1a1a1a; border: 1px solid #2a2a2a; border-bottom-left-radius: 4px; }}
.msg.bot p {{ margin: 4px 0; }}
.msg.bot code {{ background: #111; padding: 1px 5px; border-radius: 4px; font-size: 13px; }}
.msg.bot pre {{ background: #111; padding: 10px; border-radius: 8px; overflow-x: auto; margin: 6px 0; }}
.msg.bot pre code {{ background: none; padding: 0; }}
.empty {{ flex: 1; display: flex; align-items: center; justify-content: center; color: #555; font-size: 14px; }}
.typing {{ display: flex; gap: 4px; padding: 10px 14px; }}
.typing span {{ width: 6px; height: 6px; background: #00ff88; border-radius: 50%; animation: pulse 1.4s infinite; }}
.typing span:nth-child(2) {{ animation-delay: 0.2s; }}
.typing span:nth-child(3) {{ animation-delay: 0.4s; }}
.input-area {{ padding: 12px; border-top: 1px solid #1a1a1a; background: #111; }}
.input-area form {{ display: flex; gap: 8px; }}
.input-area input {{ flex: 1; padding: 10px 14px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }}
.input-area input:focus {{ border-color: #00ff88; box-shadow: 0 0 0 2px #00ff8822; }}
.input-area button {{ padding: 10px 16px; background: #00ff88; color: #0a0a0a; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }}
.input-area button:disabled {{ opacity: 0.3; cursor: not-allowed; }}
.input-area button:hover:not(:disabled) {{ opacity: 0.9; }}
.error {{ color: #ff4444; background: #1a1a1a; border: 1px solid #331111; padding: 8px 12px; border-radius: 8px; font-size: 13px; text-align: center; }}
@keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(6px); }} to {{ opacity: 1; transform: translateY(0); }} }}
@keyframes pulse {{ 0%, 80%, 100% {{ opacity: 0.3; transform: scale(0.8); }} 40% {{ opacity: 1; transform: scale(1); }} }}
</style>
</head>
<body>
<div class="header">
  <div class="dot"></div>
  <h1>{title}</h1>
</div>
<div class="messages" id="msgs">
  <div class="empty">Send a message to start chatting</div>
</div>
<div class="input-area">
  <form id="form">
    <input id="input" type="text" placeholder="Type a message..." autocomplete="off" />
    <button type="submit" id="btn">Send</button>
  </form>
</div>
<script>
const API = window.location.origin + '/api/embed/chat/{project_id}';
const KEY = '{api_key}';
let sid = localStorage.getItem('embed_sid_{project_id}');
if (!sid) {{ sid = crypto.randomUUID(); localStorage.setItem('embed_sid_{project_id}', sid); }}
const msgs = document.getElementById('msgs');
const form = document.getElementById('form');
const input = document.getElementById('input');
const btn = document.getElementById('btn');
let sending = false;

function addMsg(role, text) {{
  const empty = msgs.querySelector('.empty');
  if (empty) empty.remove();
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  d.innerHTML = role === 'user' ? esc(text) : renderMd(text);
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}}

function esc(s) {{ const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }}

function renderMd(t) {{
  return t
    .replace(/```([\\s\\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
    .replace(/\\n/g, '<br>');
}}

function showTyping() {{
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.id = 'typing';
  d.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}}

form.addEventListener('submit', async (e) => {{
  e.preventDefault();
  const m = input.value.trim();
  if (!m || sending) return;
  sending = true;
  btn.disabled = true;
  input.value = '';
  addMsg('user', m);
  showTyping();
  try {{
    const r = await fetch(API, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json', 'X-API-Key': KEY }},
      body: JSON.stringify({{ message: m, sessionId: sid }})
    }});
    const data = await r.json();
    document.getElementById('typing')?.remove();
    if (!r.ok) throw new Error(data.message || 'Error');
    addMsg('bot', data.reply);
    if (data.sessionId) sid = data.sessionId;
  }} catch (err) {{
    document.getElementById('typing')?.remove();
    const d = document.createElement('div');
    d.className = 'error';
    d.textContent = err.message;
    msgs.appendChild(d);
  }} finally {{
    sending = false;
    btn.disabled = false;
    input.focus();
  }}
}});
input.focus();
</script>
</body>
</html>'''

    resp = make_response(html)
    resp.headers['Content-Type'] = 'text/html'
    return resp
