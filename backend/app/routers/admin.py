from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_lnms_db
from app.models.users import User
from app.models.devices import Device
from app.models.alarm import Alarm
from app.models.audit_log import AuditLog
from app.schemas import UserCreate, DeviceCreate, Alarm as AlarmSchema

router = APIRouter(prefix="/admin", tags=["Administration"])


# ---------------- AUDIT LOGS ----------------

@router.get("/audit")
def get_audit_logs(limit: int = Query(100), db: Session = Depends(get_lnms_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs


# ---------------- USERS ----------------

@router.get("/users")
def get_users(db: Session = Depends(get_lnms_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
        }
        for u in users
    ]

@router.post("/users")
def create_user(data: UserCreate, db: Session = Depends(get_lnms_db)):
    # Check both email AND username for duplicates
    existing = db.query(User).filter(
        (User.email == data.email) | (User.username == data.username)
    ).first()
    if existing:
        if existing.username == data.username:
            raise HTTPException(status_code=400, detail=f"Username '{data.username}' already exists")
        raise HTTPException(status_code=400, detail=f"Email '{data.email}' already registered")

    user = User(
        username=data.username,
        email=data.email,
        role=data.role,
        hashed_password="defaultpassword"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }
    }

@router.put("/users/{user_id}")
def update_user(user_id: int, data: UserCreate, db: Session = Depends(get_lnms_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.username = data.username
    user.email = data.email
    user.role = data.role
    db.commit()
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_lnms_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# ---------------- DEVICES ----------------

@router.get("/devices")
def get_devices(db: Session = Depends(get_lnms_db)):
    devices = db.query(Device).all()
    return [
        {
            "id": d.id,
            "lnms_node_id": d.lnms_node_id,
            "hostname": d.hostname,
            "ip_address": d.ip_address,
            "device_type": d.device_type,
            "location": d.location,
            "status": d.status,
        }
        for d in devices
    ]

@router.post("/devices")
def create_device(data: DeviceCreate, db: Session = Depends(get_lnms_db)):
    existing = db.query(Device).filter(Device.ip_address == data.ip_address).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this IP already exists")
    device = Device(
        lnms_node_id=data.device_name, # Map device_name from frontend to lnms_node_id
        hostname=data.hostname,
        ip_address=data.ip_address,
        device_type=data.device_type,
        location=data.location,
        status="ACTIVE"
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {
        "message": "Device added successfully",
        "device": {
            "id": device.id,
            "lnms_node_id": device.lnms_node_id,
            "hostname": device.hostname,
            "ip_address": device.ip_address,
            "device_type": device.device_type,
            "location": device.location,
            "status": device.status,
        }
    }

@router.put("/devices/{device_id}")
def update_device(device_id: int, data: DeviceCreate, db: Session = Depends(get_lnms_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.lnms_node_id = data.device_name
    device.hostname = data.hostname
    device.ip_address = data.ip_address
    device.device_type = data.device_type
    device.location = data.location
    db.commit()
    return {"message": "Device updated successfully"}

@router.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_lnms_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted successfully"}

# ---------------- CORRELATED ALARMS ----------------

@router.get("/correlated-alarms", response_model=List[AlarmSchema])
def get_correlated_alarms(db: Session = Depends(get_lnms_db)):
    alarms = db.query(Alarm).filter(Alarm.correlation_id != None).all()
    # Map model to schema
    return [
        AlarmSchema(
            id=a.id,
            alarm_uid=a.alarm_uid,
            lnms_node_id=a.lnms_node_id,
            device_name=a.device_name,
            alarm_type=a.alarm_type,
            severity=a.severity,
            status=a.status,
            raised_at=a.raised_at,
            resolved_at=a.resolved_at
        )
        for a in alarms
    ]