from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Enum, ForeignKey
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


class EventType(str, enum.Enum):
    mariage = "mariage"
    seminaire = "séminaire"
    fete = "fête"
    autre = "autre"


class BookingStatus(str, enum.Enum):
    en_attente = "en_attente"
    confirme = "confirmé"
    annule = "annulé"
    termine = "terminé"


class Season(Base):
    """Tarification saisonnière d'un lieu (venue_id=None → s'applique à tous les lieux)."""
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#6366f1")
    start_month = Column(Integer, nullable=False)  # 1-12
    start_day = Column(Integer, nullable=False)    # 1-31
    end_month = Column(Integer, nullable=False)
    end_day = Column(Integer, nullable=False)
    price_multiplier = Column(Float, nullable=False, default=1.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    venue = relationship("Venue", back_populates="seasons")


class Discount(Base):
    """Code de remise (pourcentage ou montant fixe)."""
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)  # "percentage" | "fixed"
    value = Column(Float, nullable=False)
    min_booking_amount = Column(Float, default=0)
    max_uses = Column(Integer, nullable=True)   # None = illimité
    current_uses = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="discount")


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
    booking_venues = relationship("BookingVenue", back_populates="venue")
    seasons = relationship("Season", back_populates="venue", cascade="all, delete-orphan")


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


class BookingVenue(Base):
    """Table pivot : un booking peut inclure plusieurs lieux."""
    __tablename__ = "booking_venues"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    price_per_day = Column(Float, nullable=False)
    days = Column(Integer, nullable=False)
    seasonal_multiplier = Column(Float, default=1.0)
    season_name = Column(String(100), nullable=True)
    subtotal = Column(Float, nullable=False)

    booking = relationship("Booking", back_populates="booking_venues")
    venue = relationship("Venue", back_populates="booking_venues")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    # venue_id kept for backward compat (primary/first venue)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_name = Column(String(200))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    guest_count = Column(Integer, nullable=False)
    status = Column(String(50), default="en_attente")
    base_price = Column(Float)          # prix avant remise
    discount_id = Column(Integer, ForeignKey("discounts.id"), nullable=True)
    discount_amount = Column(Float, default=0)
    total_price = Column(Float)         # prix final après remise
    deposit_paid = Column(Boolean, default=False)
    deposit_amount = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    venue = relationship("Venue", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")
    discount = relationship("Discount", back_populates="bookings")
    booking_venues = relationship("BookingVenue", back_populates="booking",
                                  cascade="all, delete-orphan")
