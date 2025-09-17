from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Add weight for selection algorithm (previously in Person entity)
    weight = Column(Float, default=100.0)

    # Relationships
    records = relationship("Record", back_populates="owner")
    selections_as_chosen = relationship("Selection", foreign_keys="Selection.chosen_user_id", back_populates="chosen_user")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    cover_url = Column(String, nullable=True, default="")
    rym_url = Column(String, nullable=True, default="")
    
    # Link to the user who added this record
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Track if this record has been used in a selection
    used = Column(Boolean, default=False)
    
    # Relationships
    owner = relationship("User", back_populates="records")
    selections = relationship("Selection", back_populates="record")


class Selection(Base):
    __tablename__ = "selections"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    chosen_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    record_id = Column(Integer, ForeignKey("records.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # The user who initiated the selection
    participants = Column(String, nullable=True) # Comma-separated list of user IDs who participated
    weight_changes = Column(String, nullable=True) # JSON string of weight changes

    chosen_user = relationship("User", foreign_keys=[chosen_user_id])
    record = relationship("Record")
    selector = relationship("User", foreign_keys=[user_id])
    ratings = relationship("Rating", back_populates="selection", cascade="all, delete-orphan")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    selection_id = Column(Integer, ForeignKey("selections.id"), nullable=False)

    user = relationship("User")
    selection = relationship("Selection", back_populates="ratings") 