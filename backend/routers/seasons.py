from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models import Season, Venue
from auth import get_current_user, require_editor

router = APIRouter(prefix="/seasons", tags=["seasons"])


class SeasonOut(BaseModel):
    id: int
    venue_id: Optional[int] = None
    name: str
    color: str
    start_month: int
    start_day: int
    end_month: int
    end_day: int
    price_multiplier: float
    is_active: bool

    class Config:
        from_attributes = True


class SeasonCreate(BaseModel):
    venue_id: Optional[int] = None
    name: str
    color: str = "#6366f1"
    start_month: int
    start_day: int
    end_month: int
    end_day: int
    price_multiplier: float


class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    start_month: Optional[int] = None
    start_day: Optional[int] = None
    end_month: Optional[int] = None
    end_day: Optional[int] = None
    price_multiplier: Optional[float] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[SeasonOut])
def list_seasons(
    venue_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    q = db.query(Season)
    if venue_id is not None:
        q = q.filter((Season.venue_id == venue_id) | (Season.venue_id == None))  # noqa
    return q.order_by(Season.start_month, Season.start_day).all()


@router.post("/", response_model=SeasonOut, status_code=201)
def create_season(
    body: SeasonCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    if body.venue_id:
        if not db.query(Venue).filter(Venue.id == body.venue_id).first():
            raise HTTPException(404, "Lieu non trouvé")
    season = Season(**body.model_dump())
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@router.put("/{season_id}", response_model=SeasonOut)
def update_season(
    season_id: int,
    body: SeasonUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(404, "Saison non trouvée")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(season, k, v)
    db.commit()
    db.refresh(season)
    return season


@router.delete("/{season_id}", status_code=204)
def delete_season(
    season_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(404, "Saison non trouvée")
    db.delete(season)
    db.commit()
