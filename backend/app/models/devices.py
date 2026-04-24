from sqlalchemy import Column, Integer, String
from app.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    lnms_node_id = Column(String(50), nullable=True)
    hostname = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=False)
    device_type = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE")
