import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config import settings

# Graceful fallback for PostgreSQL to local SQLite
try:
    SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI
    if "postgresql" in SQLALCHEMY_DATABASE_URL:
        # Check if DB driver exists or if postgres runs
        engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
        # Test connection
        conn = engine.connect()
        conn.close()
        print("Connected successfully to PostgreSQL database.")
    else:
        raise ValueError("Non-postgres URI")
except Exception as e:
    print(f"PostgreSQL connection failed ({e}). Falling back to SQLite file: local_osteoinsight.db", file=sys.stderr)
    SQLALCHEMY_DATABASE_URL = "sqlite:///./local_osteoinsight.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# MongoDB Client Setup with In-Memory Mock Fallback
mongo_client = None
mongo_db = None

try:
    from pymongo import MongoClient
    mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    # Test connection
    mongo_client.server_info()
    mongo_db = mongo_client[settings.MONGODB_DB_NAME]
    print("Connected successfully to MongoDB database.")
except Exception as e:
    print(f"MongoDB connection failed ({e}). Falling back to fully functional in-memory JSON database mock.", file=sys.stderr)
    # Create a mock MongoDB interface
    class MockMongoCollection:
        def __init__(self):
            self.data = {}
        def find_one(self, query):
            _id = query.get("_id") or query.get("scan_id")
            return self.data.get(_id)
        def insert_one(self, doc):
            _id = doc.get("_id") or doc.get("scan_id") or "mock_id"
            self.data[_id] = doc
            return self
        def replace_one(self, query, doc, upsert=False):
            _id = query.get("_id") or query.get("scan_id")
            self.data[_id] = doc
            return self
        def find(self, query=None):
            return list(self.data.values())
            
    class MockMongoDB:
        def __init__(self):
            self.collections = {}
        def __getitem__(self, name):
            if name not in self.collections:
                self.collections[name] = MockMongoCollection()
            return self.collections[name]
            
    mongo_db = MockMongoDB()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
