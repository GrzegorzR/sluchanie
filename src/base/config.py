
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Google Sheets API configuration
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
APPLICATION_CREDS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "cred/credentials.json")

# Validate required environment variables
if not SHEET_ID:
    raise ValueError("GOOGLE_SHEET_ID environment variable is required")
if not APPLICATION_CREDS:
    raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is required")