from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

<<<<<<< HEAD
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://cnms_user:cnms1234@localhost/cnms_db?unix_socket=/var/lib/mysql/mysql.sock"
=======
SQLALCHEMY_DATABASE_URL = DATABASE_URL = "mysql+pymysql://root@127.0.0.1:3306/cnms_db"
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_lnms_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()