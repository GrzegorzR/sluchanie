#!/usr/bin/env python3
from sqlalchemy import create_engine, Column, Boolean, text
from sqlalchemy.ext.declarative import declarative_base
import os
import sys

# Get the current directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SQLALCHEMY_DATABASE_URL
from app.db_models import Base

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Add the column
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE records ADD COLUMN used BOOLEAN DEFAULT 0"))
        conn.commit()
        print("Successfully added 'used' column to records table.")
    except Exception as e:
        print(f"Error adding column: {e}") 