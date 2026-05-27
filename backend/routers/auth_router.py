from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import User
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "lecteur"


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == form.username,
        User.is_active == True,
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/password")
def change_my_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Mot de passe mis à jour"}


# --- User management (admin only) ---

@router.get("/users", response_model=List[UserOut])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    body: dict,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    new_password = body.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6 caractères)")
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Mot de passe réinitialisé"}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    db.delete(user)
    db.commit()
