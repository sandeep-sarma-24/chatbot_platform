from pymongo import MongoClient
from config import Config

client = MongoClient(Config.MONGODB_URI)
db = client['chatbot_platform']

users_col = db['users']
projects_col = db['projects']
prompts_col = db['prompts']
chats_col = db['chats']
files_col = db['files']

users_col.create_index('email', unique=True)
projects_col.create_index('user')
prompts_col.create_index('project')
chats_col.create_index([('project', 1), ('user', 1)])
chats_col.create_index([('project', 1), ('sessionId', 1)])
chats_col.create_index(
    [('project', 1), ('user', 1), ('conversationId', 1)],
    unique=True,
    sparse=True,
)
chats_col.create_index([('project', 1), ('user', 1), ('updatedAt', -1)])
files_col.create_index('project')
