from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import json

from . import crud, models, db_models
from .database import get_db
from .auth import get_current_active_user
from .utils import extract_rym_album_details, get_album_from_musicbrainz, get_album_from_discogs, extract_artist_title_from_rym_url

router = APIRouter()


# Person endpoints
@router.post("/persons/", response_model=models.Person)
def create_person(
    person: models.PersonCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # This endpoint should no longer be used
    raise HTTPException(status_code=400, detail="This endpoint is deprecated. Users are now used instead of persons.")


@router.get("/persons/", response_model=List[models.User])
def read_persons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.get_users(db, skip=skip, limit=limit)


@router.get("/persons/{person_id}", response_model=models.User)
def read_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_user = crud.get_user(db, user_id=person_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Record endpoints
@router.post("/records/", response_model=models.Record)
def create_record(
    record: models.RecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new record owned by the current user"""
    return crud.create_record(db=db, record=record, owner_id=current_user.id)


@router.post("/records/from-rym-url/", response_model=models.Record)
def create_record_from_rym_url(
    rym_url: str = Query(..., description="URL to a RateYourMusic album page"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new record from a RateYourMusic URL"""
    try:
        # First try to extract album details directly from RYM
        try:
            album_details = extract_rym_album_details(rym_url)
        except Exception as rym_error:
            # If RYM scraping fails, extract artist and title from URL and try MusicBrainz
            artist, title = extract_artist_title_from_rym_url(rym_url)
            
            if not artist or not title:
                raise ValueError(f"Could not extract artist and title from RYM URL. Original error: {str(rym_error)}")
            
            # Try MusicBrainz first    
            album_details = get_album_from_musicbrainz(artist, title)
            
            # If MusicBrainz fails, try Discogs
            if not album_details:
                album_details = get_album_from_discogs(artist, title)
            
            # If both APIs fail, raise an error
            if not album_details:
                raise ValueError(f"Could not find album info from any source. Original RYM error: {str(rym_error)}")
                
            # Add the RYM URL to the details
            album_details["rym_url"] = rym_url
        
        # Create record from extracted details
        record = models.RecordCreate(
            title=album_details["title"],
            artist=album_details["artist"],
            cover_url=album_details["cover_url"],
            rym_url=album_details["rym_url"]
        )
        
        # Save to database
        return crud.create_record(db=db, record=record, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing album data: {str(e)}")


@router.get("/records/", response_model=List[models.AllRecords])
def read_all_records(
    skip: int = 0,
    limit: int = 100,
    include_used: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all records from all users with owner names"""
    return crud.get_all_records_with_owner_name(db, skip=skip, limit=limit, include_used=include_used)


@router.get("/records/my", response_model=List[models.Record])
def read_my_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get only the current user's records"""
    return crud.get_records_by_owner(db, owner_id=current_user.id, skip=skip, limit=limit)


@router.get("/records/history", response_model=List[models.AllRecords])
def read_used_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get records that have been used (selected) in the past"""
    return crud.get_used_records_with_owner_name(db, skip=skip, limit=limit)


@router.delete("/records/{record_id}", response_model=models.Record)
def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a record owned by the current user if it hasn't been used yet"""
    db_record = crud.get_record(db, record_id=record_id)
    
    if db_record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Check if the record belongs to the current user
    if db_record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    
    # Check if the record has been used
    if db_record.used:
        raise HTTPException(status_code=400, detail="Cannot delete a record that has been used in a selection")
    
    # Delete the record
    return crud.delete_record(db, record_id=record_id)


# Selection endpoints
@router.post("/selection/", response_model=models.SelectionResult)
def perform_selection(
    participant_ids: List[int] = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Verify all participants exist
    users = crud.get_users(db)
    user_id_set = {u.id for u in users}
    
    for pid in participant_ids:
        if pid not in user_id_set:
            raise HTTPException(
                status_code=403, 
                detail=f"User with ID {pid} not found"
            )
    
    try:
        return crud.choose_record_and_update_weights(db, participant_ids, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/selection/history/", response_model=List[models.Selection])
@router.get("/selection/history/{cache_buster}", response_model=List[models.Selection])
def read_selection_history(
    cache_buster: str = None,
    my_selections_only: bool = False,
    sort_by_rating: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get selection history with optional filtering and sorting by rating"""
    # Log for debugging
    print(f"Selection history request: cache_buster={cache_buster}, my_selections_only={my_selections_only}, sort_by_rating={sort_by_rating}")
    
    if my_selections_only:
        return crud.get_selection_history(
            db, user_id=current_user.id, skip=skip, limit=limit, sort_by_rating=sort_by_rating
        )
    else:
        return crud.get_selection_history(
            db, skip=skip, limit=limit, sort_by_rating=sort_by_rating
        )


@router.get("/selection/stats/", response_model=models.SelectionStats)
def read_selection_stats(
    my_stats_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if my_stats_only:
        return crud.get_selection_stats(db, user_id=current_user.id)
    else:
        return crud.get_selection_stats(db)


@router.post("/selections/{selection_id}/rate", response_model=models.Rating)
def rate_selection(
    selection_id: int,
    rating: float = Query(..., ge=0, le=10),  # Rating must be a float between 0 and 10
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Rate a selection (0-10)"""
    # Verify selection exists
    selection = db.query(db_models.Selection).filter(
        db_models.Selection.id == selection_id
    ).first()
    
    if not selection:
        raise HTTPException(
            status_code=404,
            detail=f"Selection with ID {selection_id} not found"
        )
    
    # Create or update rating
    return crud.create_rating(db, current_user.id, selection_id, rating) 