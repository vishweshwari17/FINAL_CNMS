from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_uid = Column(String(100), unique=True, nullable=False)
    short_id = Column(String(20))
    lnms_node_id = Column(String(50), nullable=False)
    alarm_id = Column(Integer, unique=True)
    alarm_uid = Column(String(100))
    device_name = Column(String(150))
    title = Column(String(300), nullable=False)
    severity = Column(String(20), default="Info")
    status = Column(String(20), default="OPEN")
    alarm_status = Column(String(100))
    alarm_source = Column(String(20))
    last_alarm_update = Column(DateTime)
    sla_minutes = Column(Integer, default=60)
    sla_limit_minutes = Column(Integer, default=60)
    sla_used = Column(Integer, default=0)
    sla_status = Column(String(20), default="ON_TIME")
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime)
    resolution_note = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())