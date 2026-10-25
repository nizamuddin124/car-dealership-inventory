# Car Dealership Inventory System

A full-stack car dealership inventory app built with React, Tailwind CSS, FastAPI, SQLAlchemy, and a persistent database. SQLite is the easy local default; PostgreSQL is supported through `DATABASE_URL`.

## Features
- Registration/login with JWT authentication and hashed passwords
- Regular-user and administrator roles
- Vehicle listing, search/filtering, creation, update, admin-only deletion
- Purchase and admin-only restocking with transaction-safe stock updates
- Responsive React dashboard and admin forms
- Backend tests with pytest

## Project structure
- `backend/` — FastAPI API, models, schemas, security, tests
- `frontend/` — React + Vite + Tailwind UI
- `PROMPTS.md` — add genuine raw AI chat logs or public links here
- `TEST_REPORT.md` — test commands and results

## Requirements
- Python 3.10+
- Node.js 18+
- npm

PostgreSQL is optional for local evaluation because SQLite is a persistent database. For PostgreSQL, set `DATABASE_URL` in `backend/.env`.

## Run the backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

The default local database is `sqlite:///./dealership.db`, created automatically. For PostgreSQL, set for example:
`DATABASE_URL=postgresql+psycopg://dealership_user:your_password@localhost:5432/dealership`

## Create an administrator
Register a normal user through the UI or `POST /api/auth/register`, then promote that account using the one-time CLI command:
```bash
python -m app.create_admin user@example.com
```
The command only changes an existing account's role. Do not expose this command as a public API.

## Run the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173). The frontend expects the API at `http://127.0.0.1:8000`; override it with `VITE_API_URL` if needed.

## Tests
```bash
cd backend
pytest -q
```
The tests use a separate SQLite test database. Add frontend tests with `npm test` as the frontend test suite grows.

## API endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/vehicles`
- `GET /api/vehicles/search?make=&model=&category=&min_price=&max_price=`
- `POST /api/vehicles` (authenticated)
- `PUT /api/vehicles/{id}` (authenticated)
- `DELETE /api/vehicles/{id}` (administrator)
- `POST /api/vehicles/{id}/purchase` (authenticated)
- `POST /api/vehicles/{id}/restock` (administrator)

Vehicle JSON fields include `make`, `model`, `category`, `price`, `quantity`, and optional `year`, `description`, `image_url`. Purchase/restock bodies accept `{"quantity": 1}`.

## My AI Usage
Complete this section truthfully before submission. List the actual AI tools used, the tasks they helped with, what you reviewed or changed yourself, and your reflection on the impact of AI on your workflow. Do not claim manual work or testing that did not happen.

## Screenshots
Place genuine screenshots of the running application in `screenshots/` and add Markdown links here. Screenshots have not been fabricated or included by default.

## Security notes
Change `SECRET_KEY` before deployment. Use HTTPS, configure CORS to your real frontend origin, use a strong database password, and review deployment settings. This project is a learning baseline and should receive a production security review before handling real customer data.
