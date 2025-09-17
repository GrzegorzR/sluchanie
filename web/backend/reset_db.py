#!/usr/bin/env python3
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BACKEND_DIR)

from app.db_models import Base, User
from app.database import SQLALCHEMY_DATABASE_URL
from app.crud import get_password_hash

# --- Admin User Details ---
ADMIN_USERNAME = "grzesiek"
ADMIN_PASSWORD = "klop08"
ADMIN_EMAIL = "admin@example.com"
# --------------------------

def reset_database():
    """Reset the database and create only the admin user."""
    print("\n=== Database Reset Tool ===\n")
    
    # Confirm action
    confirm = input("This will DELETE ALL DATA and recreate only the admin user. Are you sure? (y/n): ")
    if confirm.lower() != 'y':
        print("Operation cancelled.")
        return
    
    print("\nResetting database...")
    
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped")
    
    # Recreate all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database schema recreated")
    
    # Create admin user
    db = SessionLocal()
    try:
        print(f"Creating admin user '{ADMIN_USERNAME}'...")
        hashed_password = get_password_hash(ADMIN_PASSWORD)
        admin_user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            hashed_password=hashed_password,
            is_active=True,
            is_admin=True,
            weight=100.0
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"✅ Admin user created successfully: id={admin_user.id}, username={admin_user.username}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
    finally:
        db.close()
    
    print("\n✅ Database reset complete. You can now run the application with only the admin user.")
    print(f"Admin username: {ADMIN_USERNAME}")
    print(f"Admin password: {ADMIN_PASSWORD}")
    print("\nLogin to create additional users and records.\n")

if __name__ == "__main__":
    reset_database() 