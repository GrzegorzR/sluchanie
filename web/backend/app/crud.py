from sqlalchemy.orm import Session
import json
import random
from typing import List, Optional
import datetime

from . import db_models, models
from .utils import get_password_hash, verify_password


# User operations
def get_user(db: Session, user_id: int):
    return db.query(db_models.User).filter(db_models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(db_models.User).filter(db_models.User.email == email).first()


def get_user_by_username(db: Session, username: str):
    return db.query(db_models.User).filter(db_models.User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(db_models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: models.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = db_models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        weight=100.0  # Default starting weight
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_weight(db: Session, user_id: int, new_weight: float):
    db_user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    if db_user:
        db_user.weight = new_weight
        db.commit()
        db.refresh(db_user)
    return db_user


# Record operations
def get_record(db: Session, record_id: int):
    return db.query(db_models.Record).filter(db_models.Record.id == record_id).first()


def get_records_by_owner(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(db_models.Record).filter(
        db_models.Record.owner_id == owner_id
    ).offset(skip).limit(limit).all()


def get_all_records(db: Session, skip: int = 0, limit: int = 100, include_used: bool = False):
    query = db.query(db_models.Record)
    if not include_used:
        query = query.filter(db_models.Record.used == False)
    return query.offset(skip).limit(limit).all()


def get_all_records_with_owner_name(db: Session, skip: int = 0, limit: int = 100, include_used: bool = False):
    # Join with the User table to get owner names
    query = db.query(
        db_models.Record, 
        db_models.User.username.label("owner_name")
    ).join(
        db_models.User, db_models.Record.owner_id == db_models.User.id
    )
    
    if not include_used:
        query = query.filter(db_models.Record.used == False)
        
    records_with_owners = query.offset(skip).limit(limit).all()
    
    # Convert to AllRecords model
    result = []
    for record, owner_name in records_with_owners:
        result.append({
            "id": record.id,
            "title": record.title,
            "artist": record.artist,
            "owner_name": owner_name,
            "used": record.used
        })
    
    return result


def get_used_records(db: Session, skip: int = 0, limit: int = 100):
    """Get records that have been used (selected) in the past"""
    return db.query(db_models.Record).filter(
        db_models.Record.used == True
    ).offset(skip).limit(limit).all()


def get_used_records_with_owner_name(db: Session, skip: int = 0, limit: int = 100):
    """Get used records with owner information"""
    records_with_owners = db.query(
        db_models.Record, 
        db_models.User.username.label("owner_name")
    ).join(
        db_models.User, db_models.Record.owner_id == db_models.User.id
    ).filter(
        db_models.Record.used == True
    ).offset(skip).limit(limit).all()
    
    # Convert to model
    result = []
    for record, owner_name in records_with_owners:
        result.append({
            "id": record.id,
            "title": record.title,
            "artist": record.artist,
            "owner_name": owner_name,
            "used": record.used
        })
    
    return result


def create_record(db: Session, record: models.RecordCreate, owner_id: int):
    db_record = db_models.Record(
        title=record.title,
        artist=record.artist,
        cover_url=record.cover_url,
        rym_url=record.rym_url,
        owner_id=owner_id
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def delete_record(db: Session, record_id: int):
    """Delete a record by ID and return the deleted record data"""
    db_record = db.query(db_models.Record).filter(db_models.Record.id == record_id).first()
    if db_record:
        # Store record data before deletion to return it
        record_data = {
            "id": db_record.id,
            "title": db_record.title,
            "artist": db_record.artist,
            "cover_url": db_record.cover_url,
            "owner_id": db_record.owner_id,
            "used": db_record.used
        }
        # Delete the record
        db.delete(db_record)
        db.commit()
        return record_data
    return None


# Rating operations
def create_rating(db: Session, user_id: int, selection_id: int, rating: float):
    """
    Create or update a rating for a selection.
    If the user has already rated this selection, update the existing rating.
    """
    # Check if rating already exists
    existing_rating = db.query(db_models.Rating).filter(
        db_models.Rating.user_id == user_id,
        db_models.Rating.selection_id == selection_id
    ).first()
    
    if existing_rating:
        # Update existing rating
        existing_rating.rating = rating
        db.commit()
        db.refresh(existing_rating)
        return existing_rating
    else:
        # Create new rating
        db_rating = db_models.Rating(
            user_id=user_id,
            selection_id=selection_id,
            rating=rating
        )
        db.add(db_rating)
        db.commit()
        db.refresh(db_rating)
        return db_rating


def get_ratings_for_selection(db: Session, selection_id: int):
    """Get all ratings for a selection"""
    return db.query(db_models.Rating).filter(
        db_models.Rating.selection_id == selection_id
    ).all()


def calculate_average_rating(db: Session, selection_id: int) -> float:
    """Calculate the average rating for a selection"""
    ratings = db.query(db_models.Rating.rating).filter(
        db_models.Rating.selection_id == selection_id
    ).all()
    
    if not ratings:
        return None
    
    return sum(r.rating for r in ratings) / len(ratings)


# Selection operations
def get_selection_history(
    db: Session, 
    user_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 100,
    sort_by_rating: bool = False
):
    """
    Get selection history with optional filtering by user and sorting by rating.
    Includes average rating and all individual ratings for each selection.
    """
    # Base query - only filter out selections where timestamp is explicitly NULL
    query = db.query(db_models.Selection).filter(db_models.Selection.timestamp != None)
    
    # Filter by user if specified
    if user_id:
        query = query.filter(db_models.Selection.user_id == user_id)
    
    # Get all selection IDs that match the criteria
    selection_ids = [s.id for s in query.all()]
    
    # If sorting by rating, calculate average ratings and sort
    if sort_by_rating and selection_ids:
        # Calculate average ratings for each selection
        selection_ratings = []
        for selection_id in selection_ids:
            avg_rating = calculate_average_rating(db, selection_id)
            selection_ratings.append((selection_id, avg_rating or 0))  # Use 0 for selections with no ratings
        
        # Sort by rating (descending)
        selection_ratings.sort(key=lambda x: x[1], reverse=True)
        
        # Get selections in the sorted order
        sorted_ids = [s[0] for s in selection_ratings]
        
        # Fetch selections in the specified order, with pagination
        # Need to use a case statement to order by the sorted_ids list
        from sqlalchemy import case
        ordering = case(
            {id_val: i for i, id_val in enumerate(sorted_ids)},
            value=db_models.Selection.id
        )
        selections = query.filter(db_models.Selection.id.in_(sorted_ids)).order_by(ordering).offset(skip).limit(limit).all()
    else:
        # Default sorting by timestamp (descending)
        selections = query.order_by(db_models.Selection.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Filter out any selections with invalid data and enrich with rating information
    valid_selections = []
    for selection in selections:
        # Skip selections with missing required data (only skip if timestamp is actually None)
        if selection.timestamp is None:
            continue
            
        # Enrich selection with rating information
        selection.ratings = get_ratings_for_selection(db, selection.id)
        selection.average_rating = calculate_average_rating(db, selection.id)
        
        # Make sure chosen_user and record are properly loaded
        if selection.chosen_user_id and not selection.chosen_user:
            selection.chosen_user = db.query(db_models.User).get(selection.chosen_user_id)
            
        if selection.record_id and not selection.record:
            selection.record = db.query(db_models.Record).get(selection.record_id)
        
        valid_selections.append(selection)
    
    return valid_selections


def create_selection(
    db: Session, 
    selection: models.SelectionCreate, 
    user_id: int,
    weight_changes: dict
):
    db_selection = db_models.Selection(
        chosen_user_id=selection.chosen_user_id,
        record_id=selection.record_id,
        user_id=user_id,
        participants=selection.participants,
        weight_changes=json.dumps(weight_changes)
    )
    db.add(db_selection)
    db.commit()
    db.refresh(db_selection)
    return db_selection


# Selection logic
def choose_record_and_update_weights(
    db: Session, 
    participant_ids: List[int],
    user_id: int
) -> models.SelectionResult:
    """Choose a random record based on weights and update the weights accordingly"""
    
    # Get all participants (users)
    participants = db.query(db_models.User).filter(
        db_models.User.id.in_(participant_ids)
    ).all()
    
    if not participants:
        raise ValueError("No participants found")
    
    # Filter out participants who don't have any unused records
    valid_participants = []
    valid_weights = []
    
    for user in participants:
        # Count unused records for this user
        record_count = db.query(db_models.Record).filter(
            db_models.Record.owner_id == user.id,
            db_models.Record.used == False
        ).count()
        
        if record_count > 0:
            valid_participants.append(user)
            valid_weights.append(user.weight)
    
    if not valid_participants:
        raise ValueError("None of the selected users have unused records available")
    
    # Choose user based on weights
    chosen_user = random.choices(valid_participants, weights=valid_weights, k=1)[0]
    
    # Get unused records belonging to the chosen user
    user_records = db.query(db_models.Record).filter(
        db_models.Record.owner_id == chosen_user.id,
        db_models.Record.used == False
    ).all()
    
    if not user_records:
        raise ValueError(f"No unused records found for user {chosen_user.username}")
    
    # Choose a random record from the user's available unused records
    chosen_record = random.choice(user_records)
    
    # Mark the record as used
    chosen_record.used = True
    db.commit()
    
    # Calculate new weights
    weight_changes = {}
    participants_count = len(participants)
    
    # How many points to redistribute
    points_to_add = min(5, chosen_user.weight // participants_count)
    
    # Update weights
    for user in participants:
        if user.id == chosen_user.id:
            # Chosen user loses points
            new_weight = user.weight - (points_to_add * (participants_count - 1))
            weight_changes[user.id] = new_weight
            update_user_weight(db, user.id, new_weight)
        else:
            # Others gain points
            new_weight = user.weight + points_to_add
            weight_changes[user.id] = new_weight
            update_user_weight(db, user.id, new_weight)
    
    # Create selection record
    selection = models.SelectionCreate(
        chosen_user_id=chosen_user.id,
        record_id=chosen_record.id,
        participants=",".join(map(str, participant_ids))
    )
    create_selection(db, selection, user_id, weight_changes)
    
    # Return selection result
    return models.SelectionResult(
        chosen_username=chosen_user.username,
        chosen_record=f"{chosen_record.artist} - {chosen_record.title}",
        new_weights=[weight_changes[user_id] for user_id in participant_ids],
        timestamp=datetime.datetime.utcnow()
    )


# Statistics
def get_selection_stats(db: Session, user_id: Optional[int] = None) -> models.SelectionStats:
    """Get statistics about selections, optionally filtered by user"""
    # Get selections
    query = db.query(db_models.Selection)
    if user_id:
        query = query.filter(db_models.Selection.user_id == user_id)
    
    selections = query.all()
    total_selections = len(selections)
    
    # User distribution
    user_counts = {}
    user_map = {u.id: u.username for u in db.query(db_models.User).all()}
    
    # Record distribution
    record_counts = {}
    record_map = {
        r.id: f"{r.artist} - {r.title}" 
        for r in db.query(db_models.Record).all()
    }
    
    # Count selections
    for selection in selections:
        # Count by user
        user_name = user_map.get(selection.chosen_user_id, "Unknown")
        if user_name in user_counts:
            user_counts[user_name] += 1
        else:
            user_counts[user_name] = 1
            
        # Count by record
        record_name = record_map.get(selection.record_id, "Unknown")
        if record_name in record_counts:
            record_counts[record_name] += 1
        else:
            record_counts[record_name] = 1
    
    # Calculate percentages for users
    user_distribution = {
        name: f"{(count/total_selections)*100:.1f}%" 
        for name, count in user_counts.items()
    } if total_selections > 0 else {}
    
    # Calculate percentages for records
    record_distribution = {
        name: f"{(count/total_selections)*100:.1f}%" 
        for name, count in record_counts.items()
    } if total_selections > 0 else {}
    
    return models.SelectionStats(
        total_selections=total_selections,
        user_distribution=user_distribution,
        record_distribution=record_distribution
    )


# Get all users with weights for selection UI
def get_users_for_selection(db: Session, skip: int = 0, limit: int = 100) -> List[models.ParticipantUser]:
    users = db.query(db_models.User).offset(skip).limit(limit).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "weight": user.weight
        }
        for user in users
    ] 