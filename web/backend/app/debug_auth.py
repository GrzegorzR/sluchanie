#!/usr/bin/env python3
import os
import sys
import getpass
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(BACKEND_DIR)) # Add parent directory (where app lives)

from app.db_models import User
from app.database import SQLALCHEMY_DATABASE_URL
from app.utils import verify_password

# Create engine and session
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_auth(username, password):
    db = SessionLocal()
    try:
        # Look up the user
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            print(f"User '{username}' not found in database.")
            
            # List users in database for debugging
            all_users = db.query(User).all()
            if all_users:
                print("\nUsers in database:")
                for u in all_users:
                    print(f"  id={u.id}, username={u.username}, is_admin={u.is_admin}, is_active={u.is_active}")
            else:
                print("No users found in database.")
            return False
        
        print(f"Found user '{username}' (id={user.id})")
        print(f"  is_admin: {user.is_admin}")
        print(f"  is_active: {user.is_active}")
        
        # Verify the password
        if verify_password(password, user.hashed_password):
            print("✅ Password verification SUCCESSFUL!")
            return True
        else:
            print("❌ Password verification FAILED!")
            return False
            
    except Exception as e:
        print(f"Error testing authentication: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=== FastAPI Authentication Tester ===")
    
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = input("Enter username: ")
    
    if len(sys.argv) > 2:
        password = sys.argv[2]
    else:
        password = getpass.getpass("Enter password: ")
    
    print(f"\nTesting authentication for user '{username}'...\n")
    test_auth(username, password) 