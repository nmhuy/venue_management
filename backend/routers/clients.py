from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from database import get_db
from models import Client
from schemas import ClientCreate, ClientUpdate, ClientOut
from auth import get_current_user, require_editor

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/", response_model=List[ClientOut])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    query = db.query(Client)
    if search:
        query = query.filter(
            or_(
                Client.first_name.ilike(f"%{search}%"),
                Client.last_name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
            )
        )
    return query.offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return client


@router.post("/", response_model=ClientOut, status_code=201)
def create_client(client: ClientCreate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    existing = db.query(Client).filter(Client.email == client.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    db_client = Client(**client.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, client: ClientUpdate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    for field, value in client.model_dump(exclude_unset=True).items():
        setattr(db_client, field, value)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    db.delete(db_client)
    db.commit()
