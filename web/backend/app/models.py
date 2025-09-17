from pydantic import BaseModel, EmailStr
from typing import List, Optional
import datetime


# User models
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    weight: float
    is_admin: Optional[bool] = False

    class Config:
        orm_mode = True


# Record models
class RecordBase(BaseModel):
    title: str
    artist: str
    cover_url: Optional[str] = ""
    rym_url: Optional[str] = ""


class RecordCreate(RecordBase):
    pass


class Record(RecordBase):
    id: int
    owner_id: int
    used: bool = False

    class Config:
        orm_mode = True


# Person models
class PersonBase(BaseModel):
    name: str


class PersonCreate(PersonBase):
    pass


class Person(PersonBase):
    id: int
    weight: float
    owner_id: int

    class Config:
        orm_mode = True


# Rating models
class RatingBase(BaseModel):
    rating: float


class RatingCreate(RatingBase):
    pass


class Rating(RatingBase):
    id: int
    user_id: int
    selection_id: int
    timestamp: datetime.datetime
    
    # Include the username for display
    user: Optional[User] = None

    class Config:
        orm_mode = True


# Selection models
class SelectionBase(BaseModel):
    chosen_user_id: Optional[int] = None
    record_id: Optional[int] = None


class SelectionCreate(SelectionBase):
    participants: str  # Comma-separated list of user IDs


class Selection(SelectionBase):
    id: int
    timestamp: datetime.datetime
    weight_changes: Optional[str] = None
    user_id: Optional[int] = None
    participants: Optional[str] = None

    # Expand related models
    chosen_user: Optional[User] = None
    record: Optional[Record] = None
    
    # Rating fields
    average_rating: Optional[float] = None
    ratings: Optional[list[Rating]] = None

    class Config:
        orm_mode = True


# Selection result model
class SelectionResult(BaseModel):
    chosen_username: str
    chosen_record: str
    new_weights: list[float]
    timestamp: datetime.datetime
    
    

# Statistics model
class SelectionStats(BaseModel):
    total_selections: int
    user_distribution: dict
    record_distribution: dict


# Records List model (for the combined records from all users)
class AllRecords(RecordBase):
    id: int
    owner_name: str
    used: bool = False
    
    class Config:
        orm_mode = True


# Participant model for selection
class ParticipantUser(BaseModel):
    id: int
    username: str
    weight: float
    
    class Config:
        orm_mode = True 