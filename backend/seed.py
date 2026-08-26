import os
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import hash_password


def seed():
    db = SessionLocal()
    try:
        accounts = [
            {
                "name": os.getenv("OWNER_NAME", "Owner"),
                "email": os.getenv("OWNER_EMAIL"),
                "password": os.getenv("OWNER_TEMP_PASSWORD"),
                "role": UserRole.owner,
            },
            {
                "name": os.getenv("SUPERVISOR_NAME", "Supervisor"),
                "email": os.getenv("SUPERVISOR_EMAIL"),
                "password": os.getenv("SUPERVISOR_TEMP_PASSWORD"),
                "role": UserRole.supervisor,
            },
        ]

        for acc in accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if existing:
                print(f"Skipping {acc['email']} — already exists")
                continue

            user = User(
                name=acc["name"],
                email=acc["email"],
                password_hash=hash_password(acc["password"]),
                role=acc["role"],
                must_change_password=True,
            )
            db.add(user)
            print(f"Created {acc['role'].value} account: {acc['email']}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()