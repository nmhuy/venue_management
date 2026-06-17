from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Venue ──────────────────────────────────────────────────────────────────────

class VenueBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    capacity_min: int = 1
    capacity_max: int
    price_per_day: float
    surface_m2: Optional[float] = None
    has_parking: bool = False
    has_catering: bool = False
    has_accommodation: bool = False
    has_garden: bool = False
    has_pool: bool = False
    has_sound_system: bool = False
    event_types: str = "mariage,séminaire,fête,autre"
    is_active: bool = True


class VenueCreate(VenueBase):
    pass


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    price_per_day: Optional[float] = None
    surface_m2: Optional[float] = None
    has_parking: Optional[bool] = None
    has_catering: Optional[bool] = None
    has_accommodation: Optional[bool] = None
    has_garden: Optional[bool] = None
    has_pool: Optional[bool] = None
    has_sound_system: Optional[bool] = None
    event_types: Optional[str] = None
    is_active: Optional[bool] = None


class VenueOut(VenueBase):
    id: int
    photos: str = ""
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Client ─────────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Duration pricing rules ──────────────────────────────────────────────────────

class DurationRuleBase(BaseModel):
    venue_id: Optional[int] = None  # null = global
    name: str
    min_days: int
    max_days: Optional[int] = None
    price_multiplier: float
    is_active: bool = True


class DurationRuleCreate(DurationRuleBase):
    pass


class DurationRuleUpdate(BaseModel):
    name: Optional[str] = None
    min_days: Optional[int] = None
    max_days: Optional[int] = None
    price_multiplier: Optional[float] = None
    is_active: Optional[bool] = None


class DurationRuleOut(DurationRuleBase):
    id: int

    class Config:
        from_attributes = True


# ── Booking ────────────────────────────────────────────────────────────────────

class BookingVenueOut(BaseModel):
    id: int
    venue_id: int
    venue: Optional[VenueOut] = None
    price_per_day: float
    days: int
    subtotal: float

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    venue_ids: List[int]   # one or more venues
    client_id: int
    event_type: str
    event_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    guest_count: int
    status: str = "en_attente"
    deposit_paid: bool = False
    deposit_amount: float = 0
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    venue_ids: Optional[List[int]] = None
    client_id: Optional[int] = None
    event_type: Optional[str] = None
    event_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    guest_count: Optional[int] = None
    status: Optional[str] = None
    deposit_paid: Optional[bool] = None
    deposit_amount: Optional[float] = None
    notes: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    venue_id: Optional[int] = None
    client_id: int
    event_type: str
    event_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    guest_count: int
    status: str
    base_price: Optional[float] = None
    duration_multiplier: Optional[float] = None
    duration_rule_name: Optional[str] = None
    total_price: Optional[float] = None
    deposit_paid: bool = False
    deposit_amount: float = 0
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    venue: Optional[VenueOut] = None
    client: Optional[ClientOut] = None
    booking_venues: List[BookingVenueOut] = []

    class Config:
        from_attributes = True


# ── Price preview ───────────────────────────────────────────────────────────────

class PricePreviewIn(BaseModel):
    venue_ids: List[int]
    start_date: datetime
    end_date: datetime


# ── Dashboard ───────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_venues: int
    active_venues: int
    total_clients: int
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    revenue_total: float
    upcoming_bookings: List[BookingOut]
