import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Google Sheets API config
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
APPLICATION_CREDS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# API Settings
API_PREFIX = "/api/v1"
PROJECT_NAME = "Rhythm Roulette" 