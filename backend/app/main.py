import hashlib
import secrets
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import User, Activity, Alert, AlertStatus, Worker, Buyer, Order, OrderStatus
from app.schemas import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
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
    BuyerDetail,
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
    LiveStockItem,
    MonthlyLedger,
    MonthlyLedgerCrop,
)
from app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_supervisor,
)
from app.email import send_password_reset_email

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


RESET_TOKEN_TTL_MINUTES = 30


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


@app.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns the same generic message, whether or not the email matches an
    account — this avoids letting someone probe which emails are registered.

    If a Resend domain isn't verified yet, the email only actually arrives when
    sent to the address the Resend account itself was signed up with.
    """
    generic_message = "If an account exists with that email, a reset link has been sent."

    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        raw_token = secrets.token_urlsafe(32)
        user.reset_token_hash = _hash_token(raw_token)
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
        db.commit()

        reset_link = f"{settings.frontend_url}/reset-password?token={raw_token}"
        send_password_reset_email(user.email, reset_link)

    return MessageResponse(message=generic_message)


@app.post("/auth/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    token_hash = _hash_token(payload.token)
    now = datetime.now(timezone.utc)
    user = (
        db.query(User)
        .filter(User.reset_token_hash == token_hash)
        .filter(User.reset_token_expires_at != None)  # noqa: E711
        .filter(User.reset_token_expires_at > now)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Request a new one.",
        )

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()

    return MessageResponse(message="Password updated. You can now log in.")


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
        activity_type_other=payload.activity_type_other if payload.activity_type == "other" else None,
        crop=payload.crop,
        crop_other=payload.crop_other if payload.crop == "other" else None,
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
    buyer = Buyer(name=payload.name, phone=payload.phone, category=payload.category)
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


@app.get("/buyers/{buyer_id}", response_model=BuyerDetail)
def get_buyer(
    buyer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """A buyer's profile — their info plus every order logged against them."""
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer not found")

    orders = (
        db.query(Order)
        .filter(Order.buyer_id == buyer_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return BuyerDetail(
        id=buyer.id,
        name=buyer.name,
        phone=buyer.phone,
        category=buyer.category,
        created_at=buyer.created_at,
        orders=orders,
    )


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
    on the form so they can see it before saving.

    notify_sms / notify_email are recorded as the supervisor's stated preference only —
    no message is actually sent yet, since no SMS or email provider is connected."""
    order = Order(
        buyer_id=payload.buyer_id,
        crop=payload.crop,
        quantity_kg=payload.quantity_kg,
        price=payload.price,
        logistics_fee=payload.logistics_fee,
        tax=payload.tax,
        notify_sms=payload.notify_sms,
        notify_email=payload.notify_email,
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


@app.get("/reports/monthly", response_model=MonthlyLedger)
def get_monthly_ledger(
    month: Optional[str] = None,  # "2026-08"; defaults to current month
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revenue summary for a given month. Cancelled orders are excluded."""
    if month:
        try:
            year_str, month_str = month.split("-")
            period_start = date(int(year_str), int(month_str), 1)
        except (ValueError, IndexError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="month must be YYYY-MM")
    else:
        today = date.today()
        period_start = date(today.year, today.month, 1)

    if period_start.month == 12:
        period_end = date(period_start.year + 1, 1, 1)
    else:
        period_end = date(period_start.year, period_start.month + 1, 1)

    orders = (
        db.query(Order)
        .filter(Order.status != OrderStatus.cancelled)
        .filter(Order.created_at >= period_start)
        .filter(Order.created_at < period_end)
        .all()
    )

    total_revenue = sum((o.total_amount for o in orders), Decimal("0"))
    total_kg = sum((o.quantity_kg for o in orders), Decimal("0"))
    order_count = len(orders)
    avg_order_value = (total_revenue / order_count) if order_count else Decimal("0")

    by_crop_map: dict[str, dict[str, Decimal]] = {}
    for o in orders:
        crop_key = o.crop.value if hasattr(o.crop, "value") else o.crop
        entry = by_crop_map.setdefault(crop_key, {"quantity_kg": Decimal("0"), "revenue": Decimal("0")})
        entry["quantity_kg"] += o.quantity_kg
        entry["revenue"] += o.total_amount

    by_crop = [
        MonthlyLedgerCrop(crop=crop, quantity_kg=vals["quantity_kg"], revenue=vals["revenue"])
        for crop, vals in sorted(by_crop_map.items())
    ]

    return MonthlyLedger(
        month=f"{period_start.year:04d}-{period_start.month:02d}",
        total_revenue=total_revenue,
        order_count=order_count,
        total_kg=total_kg,
        avg_order_value=avg_order_value,
        by_crop=by_crop,
    )
