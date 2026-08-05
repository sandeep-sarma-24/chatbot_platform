#!/bin/bash

cd /home/ubuntu/chatbot_platform/backend

source .venv/bin/activate

nohup python app.py > backend.log 2>&1 &
nohup cloudflared tunnel --url http://localhost:8000 > tunnel.log 2>&1 &

echo "Backend and Cloudflare Tunnel started."