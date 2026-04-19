from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base

class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    alarm_uid = Column(String(100), unique=True, nullable=False)
    lnms_node_id = Column(String(50), nullable=False)
    device_id = Column(Integer, nullable=True)
    device_name = Column(String(150), nullable=True)
    alarm_type = Column(String(200), nullable=False)
    severity = Column(String(20), default="Info")
    status = Column(String(20), default="OPEN")
    description = Column(String(1000), nullable=True)
    raised_at = Column(DateTime, nullable=False, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    correlation_id = Column(String(100), nullable=True)