import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite://"
from app.database import Base, get_db
from app.main import app

@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def user_token(client):
    client.post("/api/auth/register", json={"email":"user@example.com","password":"password123"})
    response = client.post("/api/auth/login", json={"email":"user@example.com","password":"password123"})
    return response.json()["access_token"]

@pytest.fixture()
def admin_token(client):
    client.post("/api/auth/register", json={"email":"admin@example.com","password":"password123"})
    # Promote the test user using the isolated test database dependency.
    from app.database import get_db
    generator = app.dependency_overrides[get_db]()
    db = next(generator)
    from app.models import User
    db.query(User).filter(User.email=="admin@example.com").update({"role":"admin"})
    db.commit()
    try:
        response = client.post("/api/auth/login", json={"email":"admin@example.com","password":"password123"})
        return response.json()["access_token"]
    finally:
        try: next(generator)
        except StopIteration: pass
