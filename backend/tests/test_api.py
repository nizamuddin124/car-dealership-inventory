def auth(token):
    return {"Authorization": f"Bearer {token}"}

def vehicle_payload(**overrides):
    data = {"make":"Toyota","model":"Corolla","category":"Sedan","price":22000,"quantity":3,"year":2023,"description":"Reliable sedan","image_url":""}
    data.update(overrides)
    return data

def test_register_and_login(client):
    response = client.post("/api/auth/register", json={"email":"new@example.com","password":"password123"})
    assert response.status_code == 201
    assert response.json()["role"] == "user"
    login = client.post("/api/auth/login", json={"email":"new@example.com","password":"password123"})
    assert login.status_code == 200
    assert login.json()["access_token"]

def test_duplicate_registration_rejected(client):
    payload = {"email":"same@example.com","password":"password123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409

def test_bad_login_rejected(client):
    client.post("/api/auth/register", json={"email":"u@example.com","password":"password123"})
    assert client.post("/api/auth/login", json={"email":"u@example.com","password":"wrong-password"}).status_code == 401

def test_vehicle_endpoints_require_auth(client):
    assert client.get("/api/vehicles").status_code == 401
    assert client.post("/api/vehicles", json=vehicle_payload()).status_code == 401

def test_create_search_and_purchase(client, user_token):
    headers = auth(user_token)
    created = client.post("/api/vehicles", json=vehicle_payload(), headers=headers)
    assert created.status_code == 201
    vehicle_id = created.json()["id"]
    searched = client.get("/api/vehicles/search?make=toy&min_price=20000", headers=headers)
    assert searched.status_code == 200 and len(searched.json()) == 1
    purchased = client.post(f"/api/vehicles/{vehicle_id}/purchase", json={"quantity":2}, headers=headers)
    assert purchased.status_code == 200
    assert purchased.json()["quantity"] == 1

def test_purchase_cannot_overdraw_stock(client, user_token):
    headers = auth(user_token)
    vehicle = client.post("/api/vehicles", json=vehicle_payload(quantity=1), headers=headers).json()
    response = client.post(f"/api/vehicles/{vehicle['id']}/purchase", json={"quantity":2}, headers=headers)
    assert response.status_code == 409
    listed = client.get("/api/vehicles", headers=headers).json()
    assert listed[0]["quantity"] == 1

def test_admin_only_delete_and_restock(client, user_token, admin_token):
    user_headers, admin_headers = auth(user_token), auth(admin_token)
    vehicle = client.post("/api/vehicles", json=vehicle_payload(quantity=1), headers=user_headers).json()
    assert client.post(f"/api/vehicles/{vehicle['id']}/restock", json={"quantity":2}, headers=user_headers).status_code == 403
    restocked = client.post(f"/api/vehicles/{vehicle['id']}/restock", json={"quantity":2}, headers=admin_headers)
    assert restocked.status_code == 200 and restocked.json()["quantity"] == 3
    assert client.delete(f"/api/vehicles/{vehicle['id']}", headers=user_headers).status_code == 403
    assert client.delete(f"/api/vehicles/{vehicle['id']}", headers=admin_headers).status_code == 204

def test_invalid_vehicle_price_rejected(client, user_token):
    response = client.post("/api/vehicles", json=vehicle_payload(price=0), headers=auth(user_token))
    assert response.status_code == 422
