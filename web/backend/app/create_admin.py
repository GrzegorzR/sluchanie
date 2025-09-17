#!/usr/bin/env python3
import asyncio
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(BACKEND_DIR)) # Add parent directory (where app lives)

from app.db_models import User
from app.database import SQLALCHEMY_DATABASE_URL, Base
from app.crud import get_password_hash

# --- Admin User Details ---
ADMIN_USERNAME = "grzesiek"
ADMIN_PASSWORD = "klop08"
ADMIN_EMAIL = "admin@example.com" # Using a placeholder email
# --------------------------

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if existing_user:
            print(f"Admin user '{ADMIN_USERNAME}' already exists.")
            # Always update password and admin status to ensure they're correct
            existing_user.is_admin = True
            existing_user.hashed_password = get_password_hash(ADMIN_PASSWORD)
            db.commit()
            print(f"Updated user '{ADMIN_USERNAME}' password and admin status.")
            # Print details while session is still active
            print(f"Admin user details: id={existing_user.id}, username={existing_user.username}, is_admin={existing_user.is_admin}, is_active={existing_user.is_active}")
            return True

        # Create new admin user
        hashed_password = get_password_hash(ADMIN_PASSWORD)
        admin_user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            hashed_password=hashed_password,
            is_active=True,
            is_admin=True, # Set as admin
            weight=100.0 # Default weight
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"Successfully created admin user: '{ADMIN_USERNAME}'")
        # Print details while session is still active
        print(f"Admin user details: id={admin_user.id}, username={admin_user.username}, is_admin={admin_user.is_admin}, is_active={admin_user.is_active}")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Attempting to create or verify admin user...")
    success = create_admin_user()
    if success:
        print("If you're seeing authentication issues, try logging in with these credentials again.") 