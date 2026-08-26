from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Activity, Alert, AlertStatus, Worker, Buyer, Order, OrderStatus
from app.schemas import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    UserOut,
    ActivityCreate,
    ActivityOut,
    AlertOut,
    HomeSummary,
    WorkerCreate,
    WorkerOut,
    WorkerDetail,
    BuyerCreate,
    BuyerOut,
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
    LiveStockItem,
)
from app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_supervisor,
)

app = FastAPI(title="Farm Platform API")

# Update allow_origins with your actual frontend URL(s) before deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    There is no sign-up route anywhere in this API by design.
    Only two accounts ever exist (owner, supervisor), created once via seed.py.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user_id=str(user.id), role=user.role.value)
    return LoginResponse(
        access_token=token,
        role=user.role.value,
        name=user.name,
        must_change_password=user.must_change_password,
    )


@app.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"detail": "Password updated"}


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/workers", response_model=WorkerOut)
def create_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    """Add a worker once — after this they can be picked from a list on every future entry,
    instead of re-entering their details each time."""
    worker = Worker(name=payload.name, phone=payload.phone, role=payload.role)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@app.get("/workers", response_model=List[WorkerOut])
def list_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Worker).order_by(Worker.name).all()


@app.get("/workers/{worker_id}", response_model=WorkerDetail)
def get_worker(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """A worker's own page — their info plus every activity they've been logged against."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    activities = (
        db.query(Activity)
        .filter(Activity.worker_id == worker_id)
        .order_by(Activity.created_at.desc())
        .all()
    )
    return WorkerDetail(
        id=worker.id,
        name=worker.name,
        phone=worker.phone,
        role=worker.role,
        created_at=worker.created_at,
        activities=activities,
    )


@app.post("/activities", response_model=ActivityOut)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    """Only the supervisor can log activities — enforced by require_supervisor."""
    activity = Activity(
        logged_by=current_user.id,
        worker_id=payload.worker_id,
        activity_type=payload.activity_type,
        crop=payload.crop,
        quantity_kg=payload.quantity_kg if payload.activity_type == "harvest" else None,
        notes=payload.notes,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    # Every "issue" entry automatically becomes an open alert.
    if activity.activity_type.value == "issue":
        alert = Alert(activity_id=activity.id, status=AlertStatus.open)
        db.add(alert)
        db.commit()

    return activity


@app.get("/activities", response_model=List[ActivityOut])
def list_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Both owner and supervisor can read this — owner is view-only, enforced on write routes."""
    return (
        db.query(Activity)
        .order_by(Activity.created_at.desc())
        .limit(50)
        .all()
    )


@app.get("/alerts", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Open alerts first (most recent first), so the most urgent issues surface at the top."""
    return (
        db.query(Alert)
        .order_by(Alert.status.desc(), Alert.created_at.desc())
        .limit(50)
        .all()
    )


@app.post("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.status = AlertStatus.resolved
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert


@app.get("/summary", response_model=HomeSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Powers the home screen stat cards."""
    today_entries = (
        db.query(func.count(Activity.id))
        .filter(func.date(Activity.created_at) == func.current_date())
        .scalar()
    )
    active_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.status == AlertStatus.open)
        .scalar()
    )
    return HomeSummary(
        today_entries=today_entries or 0,
        active_alerts=active_alerts or 0,
        pending_sync=0,  # placeholder — offline sync isn't built yet
    )


@app.post("/buyers", response_model=BuyerOut)
def create_buyer(
    payload: BuyerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    """Buyers are passive contact records — they never log in. Save once, reuse on every order."""
    buyer = Buyer(name=payload.name, phone=payload.phone)
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


@app.get("/buyers", response_model=List[BuyerOut])
def list_buyers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Buyer).order_by(Buyer.name).all()


@app.get("/live-stock", response_model=List[LiveStockItem])
def get_live_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Reads the live_stock SQL view: total harvested minus total sold (non-cancelled), per crop."""
    rows = db.execute(text("SELECT crop, available_kg FROM live_stock")).fetchall()
    return [LiveStockItem(crop=row.crop, available_kg=row.available_kg) for row in rows]


@app.post("/orders", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    """Logs a sale against a buyer. Does not hard-block over-selling past live stock —
    it's a supervisor judgment call in the field — but the live-stock number is shown
    on the form so they can see it before saving."""
    order = Order(
        buyer_id=payload.buyer_id,
        crop=payload.crop,
        quantity_kg=payload.quantity_kg,
        price=payload.price,
        logged_by=current_user.id,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(50)
        .all()
    )


@app.post("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
