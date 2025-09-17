from fastapi import FastAPI, Depends, HTTPException, Request, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from . import models, db_models, crud, auth, api
from .database import engine, SessionLocal, get_db
from .auth import get_current_admin_user # Import the admin check dependency

# Create database tables if they don't exist (Not needed if using Alembic consistently)
# db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rhythm Roulette API",
    description="API for the Rhythm Roulette application.",
    version="0.1.0",
)

# CORS Configuration
origins = [
    "http://localhost:3000", # React frontend
    "http://localhost:8000", # For admin panel
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Admin API Router ---
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import os

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

# Create simple admin API endpoints secured by admin dependency
@admin_router.get("/", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Simple dashboard with links to resources
    return f"""
    <html>
    <head>
        <title>Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            .user-info {{ margin-bottom: 20px; padding: 10px; background: #f8f8f8; }}
        </style>
    </head>
    <body>
        <h1>Rhythm Roulette Admin Dashboard</h1>
        <div class="user-info">
            Logged in as: <strong>{current_user.username}</strong> (Admin)
        </div>
        <div class="nav">
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        <p>Welcome to the admin dashboard. Choose a resource to manage.</p>
    </body>
    </html>
    """

@admin_router.get("/users", response_class=HTMLResponse)
async def list_users(
    request: Request,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    users = crud.get_users(db)
    users_html = "".join([
        f"""
        <tr>
            <td>{user.id}</td>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td>{'Yes' if user.is_active else 'No'}</td>
            <td>{'Yes' if user.is_admin else 'No'}</td>
            <td>{user.weight}</td>
            <td>
                <a href="/admin/users/{user.id}/edit" class="action-btn edit">Edit</a>
                <a href="#" onclick="deleteUser({user.id})" class="action-btn delete">Delete</a>
            </td>
        </tr>
        """
        for user in users
    ])
    
    return f"""
    <html>
    <head>
        <title>Users - Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; }}
            .action-btn {{
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                text-decoration: none;
                margin-right: 5px;
                font-size: 12px;
            }}
            .edit {{ background: #4CAF50; color: white; }}
            .delete {{ background: #f44336; color: white; }}
            .add-btn {{
                display: inline-block;
                padding: 8px 16px;
                background: #2196F3;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                margin-bottom: 20px;
            }}
            .modal {{
                display: none;
                position: fixed;
                z-index: 1;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.4);
            }}
            .modal-content {{
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 30%;
                border-radius: 8px;
            }}
            .close {{
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }}
        </style>
        <script>
            function deleteUser(userId) {{
                if (confirm('Are you sure you want to delete this user?')) {{
                    fetch(`/admin/users/${{userId}}/delete`, {{
                        method: 'DELETE',
                    }})
                    .then(response => {{
                        if (response.ok) {{
                            window.location.reload();
                        }} else {{
                            alert('Failed to delete user.');
                        }}
                    }});
                }}
            }}
        </script>
    </head>
    <body>
        <h1>Users</h1>
        <div class="nav">
            <a href="/admin">Dashboard</a>
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        
        <a href="/admin/users/new" class="add-btn">+ Add New User</a>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Active</th>
                    <th>Admin</th>
                    <th>Weight</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {users_html}
            </tbody>
        </table>
    </body>
    </html>
    """

@admin_router.get("/users/new", response_class=HTMLResponse)
async def new_user_form(
    request: Request,
    current_user: models.User = Depends(get_current_admin_user)
):
    return f"""
    <html>
    <head>
        <title>Add User - Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            .form-container {{
                max-width: 500px;
                margin: 0 auto;
            }}
            .form-group {{
                margin-bottom: 15px;
            }}
            label {{
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }}
            input[type="text"],
            input[type="email"],
            input[type="password"],
            input[type="number"] {{
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }}
            .checkbox-group {{
                margin-top: 5px;
            }}
            .btn {{
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }}
            .btn-primary {{
                background-color: #4CAF50;
                color: white;
            }}
            .btn-secondary {{
                background-color: #f0f0f0;
                color: #333;
                margin-right: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="nav">
            <a href="/admin">Dashboard</a>
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        
        <div class="form-container">
            <h1>Add New User</h1>
            
            <form action="/admin/users/new" method="post">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <div class="form-group">
                    <label for="weight">Weight</label>
                    <input type="number" id="weight" name="weight" value="100" step="1">
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="is_active" name="is_active" checked>
                        Is Active
                    </label>
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="is_admin" name="is_admin">
                        Is Admin
                    </label>
                </div>
                
                <div class="form-group">
                    <a href="/admin/users" class="btn btn-secondary">Cancel</a>
                    <button type="submit" class="btn btn-primary">Create User</button>
                </div>
            </form>
        </div>
    </body>
    </html>
    """

@admin_router.post("/users/new", response_class=HTMLResponse)
async def create_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    weight: float = Form(100.0),
    is_active: bool = Form(False),
    is_admin: bool = Form(False),
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Check if username or email already exists
    existing_user = crud.get_user_by_username(db, username)
    if existing_user:
        return f"""
        <html>
            <head>
                <meta http-equiv="refresh" content="3;url=/admin/users/new" />
                <title>Error - Rhythm Roulette Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                    .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                </style>
            </head>
            <body>
                <div class="alert">
                    <h3>Error</h3>
                    <p>Username already exists. Redirecting...</p>
                </div>
            </body>
        </html>
        """
    
    existing_email = crud.get_user_by_email(db, email)
    if existing_email:
        return f"""
        <html>
            <head>
                <meta http-equiv="refresh" content="3;url=/admin/users/new" />
                <title>Error - Rhythm Roulette Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                    .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                </style>
            </head>
            <body>
                <div class="alert">
                    <h3>Error</h3>
                    <p>Email already exists. Redirecting...</p>
                </div>
            </body>
        </html>
        """
    
    # Create new user
    user_data = models.UserCreate(username=username, email=email, password=password)
    new_user = crud.create_user(db, user_data)
    
    # Update additional fields
    new_user.weight = weight
    new_user.is_active = is_active
    new_user.is_admin = is_admin
    db.commit()
    
    # Redirect to user list
    return f"""
    <html>
        <head>
            <meta http-equiv="refresh" content="2;url=/admin/users" />
            <title>Success - Rhythm Roulette Admin</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                .success {{ padding: 20px; background-color: #4CAF50; color: white; margin-bottom: 15px; }}
            </style>
        </head>
        <body>
            <div class="success">
                <h3>Success</h3>
                <p>User created successfully. Redirecting...</p>
            </div>
        </body>
    </html>
    """

@admin_router.get("/users/{user_id}/edit", response_class=HTMLResponse)
async def edit_user_form(
    user_id: int,
    request: Request,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Get user by ID
    user = crud.get_user(db, user_id)
    if not user:
        return f"""
        <html>
            <head>
                <meta http-equiv="refresh" content="3;url=/admin/users" />
                <title>Error - Rhythm Roulette Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                    .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                </style>
            </head>
            <body>
                <div class="alert">
                    <h3>Error</h3>
                    <p>User not found. Redirecting...</p>
                </div>
            </body>
        </html>
        """
    
    return f"""
    <html>
    <head>
        <title>Edit User - Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            .form-container {{
                max-width: 500px;
                margin: 0 auto;
            }}
            .form-group {{
                margin-bottom: 15px;
            }}
            label {{
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }}
            input[type="text"],
            input[type="email"],
            input[type="password"],
            input[type="number"] {{
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }}
            .checkbox-group {{
                margin-top: 5px;
            }}
            .btn {{
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }}
            .btn-primary {{
                background-color: #4CAF50;
                color: white;
            }}
            .btn-secondary {{
                background-color: #f0f0f0;
                color: #333;
                margin-right: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="nav">
            <a href="/admin">Dashboard</a>
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        
        <div class="form-container">
            <h1>Edit User</h1>
            
            <form action="/admin/users/{user.id}/update" method="post">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" value="{user.username}" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="{user.email}" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password (leave blank to keep current)</label>
                    <input type="password" id="password" name="password">
                </div>
                
                <div class="form-group">
                    <label for="weight">Weight</label>
                    <input type="number" id="weight" name="weight" value="{user.weight}" step="1">
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="is_active" name="is_active" {"checked" if user.is_active else ""}>
                        Is Active
                    </label>
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="is_admin" name="is_admin" {"checked" if user.is_admin else ""}>
                        Is Admin
                    </label>
                </div>
                
                <div class="form-group">
                    <a href="/admin/users" class="btn btn-secondary">Cancel</a>
                    <button type="submit" class="btn btn-primary">Update User</button>
                </div>
            </form>
        </div>
    </body>
    </html>
    """

@admin_router.post("/users/{user_id}/update", response_class=HTMLResponse)
async def update_user(
    user_id: int,
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(None),
    weight: float = Form(100.0),
    is_active: bool = Form(False),
    is_admin: bool = Form(False),
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Get user by ID
    user = crud.get_user(db, user_id)
    if not user:
        return f"""
        <html>
            <head>
                <meta http-equiv="refresh" content="3;url=/admin/users" />
                <title>Error - Rhythm Roulette Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                    .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                </style>
            </head>
            <body>
                <div class="alert">
                    <h3>Error</h3>
                    <p>User not found. Redirecting...</p>
                </div>
            </body>
        </html>
        """
    
    # Check if username or email already exists (for other users)
    if username != user.username:
        existing_user = crud.get_user_by_username(db, username)
        if existing_user and existing_user.id != user_id:
            return f"""
            <html>
                <head>
                    <meta http-equiv="refresh" content="3;url=/admin/users/{user_id}/edit" />
                    <title>Error - Rhythm Roulette Admin</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                        .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                    </style>
                </head>
                <body>
                    <div class="alert">
                        <h3>Error</h3>
                        <p>Username already exists. Redirecting...</p>
                    </div>
                </body>
            </html>
            """
    
    if email != user.email:
        existing_email = crud.get_user_by_email(db, email)
        if existing_email and existing_email.id != user_id:
            return f"""
            <html>
                <head>
                    <meta http-equiv="refresh" content="3;url=/admin/users/{user_id}/edit" />
                    <title>Error - Rhythm Roulette Admin</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                        .alert {{ padding: 20px; background-color: #f44336; color: white; margin-bottom: 15px; }}
                    </style>
                </head>
                <body>
                    <div class="alert">
                        <h3>Error</h3>
                        <p>Email already exists. Redirecting...</p>
                    </div>
                </body>
            </html>
            """
    
    # Update user
    user.username = username
    user.email = email
    if password:
        user.hashed_password = crud.get_password_hash(password)
    user.weight = weight
    user.is_active = is_active
    user.is_admin = is_admin
    db.commit()
    
    # Redirect to user list
    return f"""
    <html>
        <head>
            <meta http-equiv="refresh" content="2;url=/admin/users" />
            <title>Success - Rhythm Roulette Admin</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                .success {{ padding: 20px; background-color: #4CAF50; color: white; margin-bottom: 15px; }}
            </style>
        </head>
        <body>
            <div class="success">
                <h3>Success</h3>
                <p>User updated successfully. Redirecting...</p>
            </div>
        </body>
    </html>
    """

@admin_router.delete("/users/{user_id}/delete")
async def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Get user by ID
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete user
    db.delete(user)
    db.commit()
    
    return {"success": True}

@admin_router.get("/records", response_class=HTMLResponse)
async def list_records(
    request: Request,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    records = crud.get_all_records_with_owner_name(db, include_used=True)
    records_html = "".join([
        f"""
        <tr>
            <td>{record['id']}</td>
            <td>{record['title']}</td>
            <td>{record['artist']}</td>
            <td>{record['owner_name']}</td>
            <td>{'Yes' if record['used'] else 'No'}</td>
        </tr>
        """
        for record in records
    ])
    
    return f"""
    <html>
    <head>
        <title>Records - Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>Records</h1>
        <div class="nav">
            <a href="/admin">Dashboard</a>
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Owner</th>
                    <th>Used</th>
                </tr>
            </thead>
            <tbody>
                {records_html}
            </tbody>
        </table>
    </body>
    </html>
    """

@admin_router.get("/selections", response_class=HTMLResponse)
async def list_selections(
    request: Request,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    selections = crud.get_selection_history(db)
    selections_html = ""
    
    for selection in selections:
        # Get related objects
        chosen_user = db.query(db_models.User).filter(db_models.User.id == selection.chosen_user_id).first()
        record = db.query(db_models.Record).filter(db_models.Record.id == selection.record_id).first()
        selector = db.query(db_models.User).filter(db_models.User.id == selection.user_id).first()
        
        selections_html += f"""
        <tr>
            <td>{selection.id}</td>
            <td>{selection.timestamp}</td>
            <td>{chosen_user.username if chosen_user else 'Unknown'}</td>
            <td>{f"{record.artist} - {record.title}" if record else 'Unknown'}</td>
            <td>{selector.username if selector else 'Unknown'}</td>
            <td>{selection.participants}</td>
        </tr>
        """
    
    return f"""
    <html>
    <head>
        <title>Selections - Rhythm Roulette Admin</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
            h1 {{ color: #333; }}
            .nav {{ display: flex; gap: 15px; margin-bottom: 20px; }}
            .nav a {{ 
                text-decoration: none; 
                padding: 8px 16px; 
                background: #f0f0f0; 
                color: #333; 
                border-radius: 4px;
            }}
            .nav a:hover {{ background: #ddd; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>Selections</h1>
        <div class="nav">
            <a href="/admin">Dashboard</a>
            <a href="/admin/users">Users</a>
            <a href="/admin/records">Records</a>
            <a href="/admin/selections">Selections</a>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Timestamp</th>
                    <th>Chosen User</th>
                    <th>Record</th>
                    <th>Selected By</th>
                    <th>Participants</th>
                </tr>
            </thead>
            <tbody>
                {selections_html}
            </tbody>
        </table>
    </body>
    </html>
    """

# Add REST API endpoints for admin
from fastapi import status
from pydantic import BaseModel
from typing import Optional, List # Use lowercase list
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    weight: float = 100
    is_active: bool = True
    is_admin: bool = False

class UserUpdate(BaseModel):
    username: str
    email: str
    password: Optional[str] = None # Use Optional
    weight: float = 100
    is_active: bool = True
    is_admin: bool = False

# Added RecordUpdate model here
class RecordUpdate(BaseModel):
    title: str
    artist: str
    cover_url: Optional[str] = None  # Adding cover_url field as optional
    # used: Optional[bool] = None # Uncomment if needed

# <<< START NEW MODELS FOR HISTORICAL DATA >>>
class HistoricalSelectionCreate(BaseModel):
    timestamp_str: str # Expected format YYYY:MM:DD or ISO 8601
    chosen_user_id: int
    record_id: int
    selector_id: int # The user who initiated the selection (e.g., the winner)
    participants_ids: list[int]
    # We don't include weight_changes as they are recalculated live

class AdminRatingCreate(BaseModel):
    user_id: int
    rating: float # Allow float here, validation can be in endpoint
# <<< END NEW MODELS FOR HISTORICAL DATA >>>

@admin_router.get("/users/api", response_model=list[models.User])
async def api_list_users(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    return crud.get_users(db)

@admin_router.post("/users/api", response_model=models.User, status_code=status.HTTP_201_CREATED)
async def api_create_user(
    user_data: UserCreate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Check if username or email already exists
    existing_user = crud.get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    existing_email = crud.get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create new user
    user_create = models.UserCreate(
        username=user_data.username, 
        email=user_data.email, 
        password=user_data.password
    )
    new_user = crud.create_user(db, user_create)
    
    # Update additional fields
    new_user.weight = user_data.weight
    new_user.is_active = user_data.is_active
    new_user.is_admin = user_data.is_admin
    db.commit()
    db.refresh(new_user)
    
    return new_user

@admin_router.get("/users/api/{user_id}", response_model=models.User)
async def api_get_user(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@admin_router.put("/users/api/{user_id}", response_model=models.User)
async def api_update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Get user by ID
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if username or email already exists (for other users)
    if user_data.username != user.username:
        existing_user = crud.get_user_by_username(db, user_data.username)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    
    if user_data.email != user.email:
        existing_email = crud.get_user_by_email(db, user_data.email)
        if existing_email and existing_email.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    
    # Update user
    user.username = user_data.username
    user.email = user_data.email
    if user_data.password:
        user.hashed_password = crud.get_password_hash(user_data.password)
    user.weight = user_data.weight
    user.is_active = user_data.is_active
    user.is_admin = user_data.is_admin
    db.commit()
    db.refresh(user)
    
    return user

@admin_router.delete("/users/api/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Get user by ID
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Delete user
    db.delete(user)
    db.commit()
    
    return None

# Add REST API endpoints for admin selections
@admin_router.get("/selections/api", response_model=list[dict])
async def api_list_selections(
    sort_by_rating: bool = False,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    selection_history = crud.get_selection_history(db, sort_by_rating=sort_by_rating)
    result = []
    
    for selection in selection_history:
        # Get related objects
        chosen_user = db.query(db_models.User).filter(db_models.User.id == selection.chosen_user_id).first() if selection.chosen_user_id else None
        record = db.query(db_models.Record).filter(db_models.Record.id == selection.record_id).first() if selection.record_id else None
        selector = db.query(db_models.User).filter(db_models.User.id == selection.user_id).first() if selection.user_id else None
        
        selection_dict = {
            "id": selection.id,
            "timestamp": selection.timestamp,
            "chosen_user": {
                "id": chosen_user.id,
                "username": chosen_user.username
            } if chosen_user else None,
            "record": {
                "id": record.id,
                "title": record.title,
                "artist": record.artist
            } if record else None,
            "selector": {
                "id": selector.id,
                "username": selector.username
            } if selector else None,
            "participants": selection.participants,
            "average_rating": selection.average_rating,
            "ratings_count": len(selection.ratings) if selection.ratings else 0
        }
        result.append(selection_dict)
    
    return result

# <<< START NEW ADMIN SELECTION/RATING ENDPOINTS >>>
@admin_router.post("/selections/api/historical", response_model=models.Selection, status_code=status.HTTP_201_CREATED)
async def api_create_historical_selection(
    selection_data: HistoricalSelectionCreate,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a historical selection record."""
    try:
        # Parse timestamp (handle YYYY:MM:DD and ISO format)
        try:
            # Try ISO 8601 format first (more standard)
            timestamp = datetime.datetime.fromisoformat(selection_data.timestamp_str)
        except ValueError:
            # Try YYYY:MM:DD format
            timestamp = datetime.datetime.strptime(selection_data.timestamp_str, '%Y:%m:%d')
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timestamp format. Use YYYY:MM:DD or ISO 8601. Received: {selection_data.timestamp_str}"
        )

    # Convert participant IDs to comma-separated string
    participants_str = ",".join(map(str, selection_data.participants_ids))

    # Create the database model instance
    db_selection = db_models.Selection(
        timestamp=timestamp,
        chosen_user_id=selection_data.chosen_user_id,
        record_id=selection_data.record_id,
        user_id=selection_data.selector_id, # User who ran the selection (e.g., winner)
        participants=participants_str,
        # weight_changes is not set for historical import
    )

    try:
        db.add(db_selection)
        db.commit()
        db.refresh(db_selection)
        # Manually load relationships for the response model if needed
        # db_selection.chosen_user = db.query(db_models.User).get(db_selection.chosen_user_id)
        # db_selection.record = db.query(db_models.Record).get(db_selection.record_id)
        # db_selection.ratings = [] # Start with empty ratings
        return db_selection
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating selection: {e}"
        )

@admin_router.post("/selections/api/{selection_id}/rate", response_model=models.Rating, status_code=status.HTTP_201_CREATED)
async def api_admin_rate_selection(
    selection_id: int,
    rating_data: AdminRatingCreate,
    current_admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to add or update a rating for a specific user on a selection."""
    # Validate rating value
    if not (0 <= rating_data.rating <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 0 and 10"
        )

    # Verify selection exists
    selection = db.query(db_models.Selection).filter(db_models.Selection.id == selection_id).first()
    if not selection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Selection with ID {selection_id} not found"
        )

    # Verify user exists
    user = db.query(db_models.User).filter(db_models.User.id == rating_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {rating_data.user_id} not found"
        )

    try:
        # Use the existing crud function to create/update the rating
        created_rating = crud.create_rating(
            db=db,
            user_id=rating_data.user_id,
            selection_id=selection_id,
            rating=rating_data.rating
        )
        return created_rating
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating rating: {e}"
        )
# <<< END NEW ADMIN SELECTION/RATING ENDPOINTS >>>

# Add REST API endpoints for admin records
@admin_router.get("/records/api", response_model=list[dict])
async def api_list_records(
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of all records with their owner's name.
    """
    records = crud.get_all_records(db, include_used=True)
    result = []
    for record in records:
        # Fetch owner name separately if needed, or adjust if get_all_records provides it
        owner = crud.get_user(db, record.owner_id) if record.owner_id else None
        owner_name = owner.username if owner else "None"
        result.append({
            "id": record.id,
            "title": record.title,
            "artist": record.artist,
            "owner_id": record.owner_id,
            "owner_name": owner_name,
            "used": record.used,
        })
    return result

# Added PUT endpoint for updating records
@admin_router.put("/records/api/{record_id}", response_model=models.Record)
async def api_update_record(
    record_id: int,
    record_data: RecordUpdate,
    current_user: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing record's details (e.g., title, artist).
    Requires admin privileges.
    """
    print(f"Updating record {record_id} with data: {record_data}")
    print(f"Request by admin user: {current_user.username} (ID: {current_user.id})")
    
    db_record = crud.get_record(db, record_id=record_id)
    if db_record is None:
        print(f"Record {record_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    # Update fields from the request body
    update_data = record_data.dict(exclude_unset=True) # Use exclude_unset to only update provided fields
    for key, value in update_data.items():
        setattr(db_record, key, value)

    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    print(f"Record {record_id} updated successfully")
    return db_record

# Include API routers
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(api.router, prefix="/api/v1", tags=["API"])
app.include_router(admin_router) # Include the new admin router

@app.get("/")
def read_root():
    return {"message": "Welcome to the Rhythm Roulette API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 