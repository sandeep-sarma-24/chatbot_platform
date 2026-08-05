import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv('PORT', 8000))
    MONGODB_URI = os.getenv('MONGODB_URI')
    JWT_SECRET = os.getenv('JWT_SECRET')
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_FILE_SIZE = 10 * 1024 * 1024
