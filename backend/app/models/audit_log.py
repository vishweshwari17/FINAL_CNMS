from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.database import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), nullable=True)
    action = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
