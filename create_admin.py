import sys
from .database import SessionLocal
from .models import User

def main():
    if len(sys.argv) != 2:
        print("Usage: python -m app.create_admin user@example.com")
        raise SystemExit(2)
    email = sys.argv[1].lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print("No user found with that email. Register first.")
            raise SystemExit(1)
        user.role = "admin"
        db.commit()
        print(f"Administrator role granted to {email}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
