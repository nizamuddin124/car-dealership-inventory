from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session
from .config import FRONTEND_ORIGIN
from .database import Base, engine, get_db
from .dependencies import admin_user, current_user
from .models import User, Vehicle
from .schemas import LoginInput, QuantityInput, RegisterInput, TokenOut, UserOut, VehicleInput, VehicleOut, VehicleUpdate
from .security import create_access_token, hash_password, verify_password

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Dealership Inventory API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterInput, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, password_hash=hash_password(payload.password), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.email, user.role)
    return {"access_token": token, "token_type": "bearer", "user": user}

def vehicle_or_404(db: Session, vehicle_id: int):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@app.get("/api/vehicles", response_model=list[VehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    return db.query(Vehicle).order_by(Vehicle.id.desc()).offset(skip).limit(limit).all()

@app.get("/api/vehicles/search", response_model=list[VehicleOut])
def search_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="min_price cannot exceed max_price")
    query = db.query(Vehicle)
    if make:
        query = query.filter(Vehicle.make.ilike(f"%{make.strip()}%"))
    if model:
        query = query.filter(Vehicle.model.ilike(f"%{model.strip()}%"))
    if category:
        query = query.filter(Vehicle.category.ilike(f"%{category.strip()}%"))
    if min_price is not None:
        query = query.filter(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.filter(Vehicle.price <= max_price)
    return query.order_by(Vehicle.id.desc()).all()

@app.post("/api/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleInput, db: Session = Depends(get_db), user: User = Depends(current_user)):
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    vehicle = vehicle_or_404(db, vehicle_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@app.delete("/api/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(admin_user)):
    vehicle = vehicle_or_404(db, vehicle_id)
    db.delete(vehicle)
    db.commit()
    return None

@app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehicleOut)
def purchase_vehicle(vehicle_id: int, payload: QuantityInput, db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Locking is honored by PostgreSQL; SQLite serializes writes. The stock check and update share a transaction.
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).with_for_update().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.quantity < payload.quantity:
        db.rollback()
        raise HTTPException(status_code=409, detail="Insufficient stock")
    vehicle.quantity -= payload.quantity
    db.commit()
    db.refresh(vehicle)
    return vehicle

@app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehicleOut)
def restock_vehicle(vehicle_id: int, payload: QuantityInput, db: Session = Depends(get_db), user: User = Depends(admin_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).with_for_update().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.quantity += payload.quantity
    db.commit()
    db.refresh(vehicle)
    return vehicle
