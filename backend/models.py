from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    editeur = "éditeur"
    lecteur = "lecteur"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="lecteur")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    capacity_min = Column(Integer, default=1)
    capacity_max = Column(Integer, nullable=False)
    price_per_day = Column(Float, nullable=False)
    surface_m2 = Column(Float)
    has_parking = Column(Boolean, default=False)
    has_catering = Column(Boolean, default=False)
    has_accommodation = Column(Boolean, default=False)
    has_garden = Column(Boolean, default=False)
    has_pool = Column(Boolean, default=False)
    has_sound_system = Column(Boolean, default=False)
    event_types = Column(String(200), default="mariage,séminaire,fête,autre")
    photos = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bookings = relationship("Booking", back_populates="venue")
    duration_rules = relationship("DurationPricingRule", back_populates="venue")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    address = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="client")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    # venue_id kept for backward compat — always set to first venue in venue_ids
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_name = Column(String(200))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    guest_count = Column(Integer, nullable=False)
    status = Column(String(50), default="en_attente")
    # Pricing breakdown stored at booking time
    base_price = Column(Float)           # sum of venue subtotals before duration discount
    duration_multiplier = Column(Float, default=1.0)
    duration_rule_name = Column(String(100))
    total_price = Column(Float)
    deposit_paid = Column(Boolean, default=False)
    deposit_amount = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    venue = relationship("Venue", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")
    booking_venues = relationship(
        "BookingVenue", back_populates="booking", cascade="all, delete-orphan"
    )


class BookingVenue(Base):
    """Pivot: one row per (booking, venue) pair. Stores a price snapshot."""
    __tablename__ = "booking_venues"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    price_per_day = Column(Float, nullable=False)
    days = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False)  # price_per_day * days

    booking = relationship("Booking", back_populates="booking_venues")
    venue = relationship("Venue")


class DurationPricingRule(Base):
    """Price multiplier that applies when a booking lasts a given number of days.
    venue_id=NULL means the rule applies globally to all venues."""
    __tablename__ = "duration_pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    name = Column(String(100), nullable=False)
    min_days = Column(Integer, nullable=False)
    max_days = Column(Integer, nullable=True)  # NULL = no upper bound
    price_multiplier = Column(Float, nullable=False, default=1.0)
    is_active = Column(Boolean, default=True)

    venue = relationship("Venue", back_populates="duration_rules")
