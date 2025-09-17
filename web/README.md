# Rhythm Roulette: Modern Web App

A modern web application for the Rhythm Roulette record selection system, featuring a FastAPI backend and React frontend.

## Project Structure

```
web/
├── backend/             # FastAPI backend
│   ├── alembic/         # Database migrations
│   ├── app/             # Application code
│   │   ├── __init__.py  # Package initialization
│   │   ├── main.py      # FastAPI application
│   │   ├── api.py       # API routes
│   │   ├── auth.py      # Authentication
│   │   ├── config.py    # Configuration
│   │   ├── crud.py      # Database operations
│   │   ├── database.py  # Database connection
│   │   ├── db_models.py # SQLAlchemy models
│   │   ├── models.py    # Pydantic models
│   │   └── utils.py     # Utility functions
│   ├── requirements.txt # Python dependencies
│   ├── alembic.ini      # Alembic configuration
│   ├── run.py           # Application runner
│   └── import_data.py   # Data import script
│
└── frontend/            # React frontend
    ├── public/          # Static files
    ├── src/             # React source code
    │   ├── components/  # Reusable components
    │   ├── pages/       # Page components
    │   ├── services/    # API services
    │   ├── App.js       # Main application
    │   └── index.js     # Entry point
    ├── package.json     # NPM dependencies
    └── .env             # Environment variables
```

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd web/backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up the database:
   ```
   # Create the initial migration
   alembic revision --autogenerate -m "Initial migration"
   
   # Apply the migration
   alembic upgrade head
   ```

5. Import data from Google Sheets (optional):
   ```
   python import_data.py
   ```

6. Run the backend server:
   ```
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd web/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

The application will be accessible at http://localhost:3000.

## Features

- **User Authentication**: Register and login system
- **Person Management**: Add, view, and manage people and their records
- **Record Selection**: Randomly select a record with weighted probabilities
- **Weight Rebalancing**: Automatic adjustment of weights after selection
- **History Tracking**: View past selections and trends
- **Statistics**: View selection patterns and distribution

## API Endpoints

- **Authentication**: `/api/v1/token`, `/api/v1/register`
- **Persons**: `/api/v1/persons/`
- **Records**: `/api/v1/persons/{person_id}/records/`
- **Selection**: `/api/v1/selection/`
- **History**: `/api/v1/selection/history/`
- **Statistics**: `/api/v1/selection/stats/` 