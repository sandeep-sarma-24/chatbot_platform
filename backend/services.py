import logging

import requests as http_requests

from config import Config

log = logging.getLogger('services')

MODEL = 'meta-llama/llama-3.1-8b-instruct'


def build_system_content(project, prompts, files):
    parts = [project.get('systemPrompt', 'You are a helpful assistant.')]

    if prompts:
        parts.append('\n--- Knowledge Base (Prompts) ---')
        for p in prompts:
            parts.append(f'\n### {p["title"]}\n{p["content"]}')

    if files:
        parts.append('\n--- Knowledge Base (Documents) ---')
        for f in files:
            content = f['content'][:30000]
            parts.append(f'\n### {f["originalName"]}\n{content}')

    return '\n'.join(parts)


def call_llm(messages):
    if not Config.OPENROUTER_API_KEY:
        return None, ('LLM not configured', 502)

    try:
        response = http_requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {Config.OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Chatbot Platform'
            },
            json={
                'model': MODEL,
                'messages': messages
            },
            timeout=30
        )
        response_data = response.json()

        if response.status_code != 200:
            log.error('OpenRouter returned %d: %s', response.status_code, response_data)
            return None, ('LLM service error', 502)

        return response_data['choices'][0]['message']['content'], None

    except http_requests.Timeout:
        log.error('OpenRouter request timed out')
        return None, ('LLM request timed out — please try again', 504)
    except Exception as e:
        log.error('OpenRouter call failed: %s', e, exc_info=True)
        return None, ('LLM service error', 502)
