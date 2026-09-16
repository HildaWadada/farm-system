import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class WorkerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    role: Optional[str] = None


class WorkerOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    role: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityCreate(BaseModel):
    activity_type: str  # spray | weed | irrigate | fertilize | harvest | issue | other
    activity_type_other: Optional[str] = None  # required when activity_type == "other"
    crop: str           # dragon_fruit | citrus | hass_avocado | chilli | other
    crop_other: Optional[str] = None  # required when crop == "other"
    worker_id: Optional[uuid.UUID] = None
    quantity_kg: Optional[Decimal] = None  # only meaningful when activity_type == "harvest"
    notes: Optional[str] = None
    photo_url: Optional[str] = None  # base64 data URI; only meaningful when activity_type == "issue"


class ActivityOut(BaseModel):
    id: uuid.UUID
    activity_type: str
    activity_type_other: Optional[str] = None
    crop: str
    crop_other: Optional[str] = None
    block: Optional[str]
    quantity_kg: Optional[Decimal]
    notes: Optional[str]
    photo_url: Optional[str] = None
    created_at: datetime
    worker: Optional[WorkerOut] = None

    class Config:
        from_attributes = True


class WorkerDetail(WorkerOut):
    activities: list[ActivityOut] = []


class AlertOut(BaseModel):
    id: uuid.UUID
    activity_id: uuid.UUID
    status: str
    resolution_note: Optional[str]
    created_at: datetime
    activity: ActivityOut

    class Config:
        from_attributes = True


class HomeSummary(BaseModel):
    today_entries: int
    active_alerts: int
    pending_sync: int


class BuyerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    category: Optional[str] = None


class BuyerOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    buyer_id: uuid.UUID
    crop: str
    quantity_kg: Decimal
    price: Decimal  # subtotal, before fees/tax
    logistics_fee: Decimal = Decimal("0")
    tax: Decimal = Decimal("0")
    notify_sms: bool = False
    notify_email: bool = False


class OrderStatusUpdate(BaseModel):
    status: str  # pending | paid | cancelled


class OrderOut(BaseModel):
    id: uuid.UUID
    crop: str
    quantity_kg: Decimal
    price: Decimal
    logistics_fee: Decimal
    tax: Decimal
    total_amount: Decimal
    notify_sms: bool
    notify_email: bool
    status: str
    created_at: datetime
    buyer: BuyerOut

    class Config:
        from_attributes = True


class BuyerDetail(BuyerOut):
    orders: list[OrderOut] = []


class MonthlyLedgerCrop(BaseModel):
    crop: str
    quantity_kg: Decimal
    revenue: Decimal


class MonthlyLedger(BaseModel):
    month: str  # "2026-08"
    total_revenue: Decimal
    order_count: int
    total_kg: Decimal
    avg_order_value: Decimal
    by_crop: list[MonthlyLedgerCrop]


class LiveStockItem(BaseModel):
    crop: str
    available_kg: Decimal


class VendorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    category: Optional[str] = None


class VendorOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    vendor_id: uuid.UUID
    item: str
    quantity: Decimal
    unit: Optional[str] = None
    cost: Decimal


class PurchaseStatusUpdate(BaseModel):
    status: str  # pending | paid | cancelled


class PurchaseOut(BaseModel):
    id: uuid.UUID
    item: str
    quantity: Decimal
    unit: Optional[str]
    cost: Decimal
    status: str
    created_at: datetime
    vendor: VendorOut

    class Config:
        from_attributes = True


class VendorDetail(VendorOut):
    purchases: list[PurchaseOut] = []
