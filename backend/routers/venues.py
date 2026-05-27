from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os, uuid, aiofiles
from database import get_db
from models import Venue, Booking
from schemas import VenueCreate, VenueUpdate, VenueOut
from auth import get_current_user, require_editor

router = APIRouter(prefix="/venues", tags=["venues"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=List[VenueOut])
def list_venues(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    city: Optional[str] = None,
    event_type: Optional[str] = None,
    capacity: Optional[int] = None,
    max_price: Optional[float] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    query = db.query(Venue)
    if active_only:
        query = query.filter(Venue.is_active == True)
    if search:
        query = query.filter(
            or_(Venue.name.ilike(f"%{search}%"), Venue.city.ilike(f"%{search}%"))
        )
    if city:
        query = query.filter(Venue.city.ilike(f"%{city}%"))
    if event_type:
        query = query.filter(Venue.event_types.ilike(f"%{event_type}%"))
    if capacity:
        query = query.filter(Venue.capacity_min <= capacity, Venue.capacity_max >= capacity)
    if max_price:
        query = query.filter(Venue.price_per_day <= max_price)
    return query.offset(skip).limit(limit).all()


@router.get("/{venue_id}", response_model=VenueOut)
def get_venue(venue_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    return venue


@router.post("/", response_model=VenueOut, status_code=201)
def create_venue(venue: VenueCreate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_venue = Venue(**venue.model_dump())
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue


@router.put("/{venue_id}", response_model=VenueOut)
def update_venue(venue_id: int, venue: VenueUpdate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    for field, value in venue.model_dump(exclude_unset=True).items():
        setattr(db_venue, field, value)
    db.commit()
    db.refresh(db_venue)
    return db_venue


@router.delete("/{venue_id}", status_code=204)
def delete_venue(venue_id: int, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    db_venue.is_active = False
    db.commit()


@router.post("/{venue_id}/photos")
async def upload_photo(venue_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _: object = Depends(require_editor)):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Format d'image non supporté")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    photos = venue.photos.split(",") if venue.photos else []
    photos = [p for p in photos if p]
    photos.append(filename)
    venue.photos = ",".join(photos)
    db.commit()
    return {"filename": filename}


@router.get("/{venue_id}/availability")
def check_availability(
    venue_id: int,
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    from datetime import datetime
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)

    conflicting = db.query(Booking).filter(
        Booking.venue_id == venue_id,
        Booking.status.in_(["en_attente", "confirmé"]),
        Booking.start_date < end,
        Booking.end_date > start,
    ).count()

    return {"available": conflicting == 0, "conflicts": conflicting}
