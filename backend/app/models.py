import uuid
import enum

from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    owner = "owner"
    supervisor = "supervisor"


class ActivityType(str, enum.Enum):
    spray = "spray"
    weed = "weed"
    irrigate = "irrigate"
    fertilize = "fertilize"
    harvest = "harvest"
    issue = "issue"
    other = "other"


class CropType(str, enum.Enum):
    dragon_fruit = "dragon_fruit"
    citrus = "citrus"
    hass_avocado = "hass_avocado"
    chilli = "chilli"
    other = "other"


class AlertStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role"), nullable=False)
    must_change_password = Column(Boolean, nullable=False, default=True)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Worker(Base):
    __tablename__ = "workers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=True)  # free-text e.g. "Field worker", "Casual labourer"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    logged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=True)
    activity_type = Column(Enum(ActivityType, name="activity_type"), nullable=False)
    activity_type_other = Column(Text, nullable=True)  # free text when activity_type = 'other'
    crop = Column(Enum(CropType, name="crop_type"), nullable=False)
    crop_other = Column(Text, nullable=True)  # free text when crop = 'other'
    block = Column(String, nullable=True)
    quantity_kg = Column(Numeric(10, 2), nullable=True)
    photo_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    worker = relationship("Worker")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    status = Column(Enum(AlertStatus, name="alert_status"), nullable=False, default=AlertStatus.open)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    activity = relationship("Activity")


class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    category = Column(String, nullable=True)  # e.g. "Retailer", "Wholesaler", "Restaurant"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("buyers.id"), nullable=False)
    crop = Column(Enum(CropType, name="crop_type"), nullable=False)
    quantity_kg = Column(Numeric(10, 2), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)  # subtotal, before fees/tax
    logistics_fee = Column(Numeric(12, 2), nullable=False, default=0)
    tax = Column(Numeric(12, 2), nullable=False, default=0)
    notify_sms = Column(Boolean, nullable=False, default=False)
    notify_email = Column(Boolean, nullable=False, default=False)
    status = Column(Enum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.pending)
    logged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    buyer = relationship("Buyer")

    @property
    def total_amount(self):
        return self.price + self.logistics_fee + self.tax
