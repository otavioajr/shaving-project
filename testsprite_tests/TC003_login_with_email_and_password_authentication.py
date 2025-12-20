import requests

BASE_URL = "http://localhost:3000"
HEADERS = {
    "x-tenant-slug": "barbearia-teste",
    "Content-Type": "application/json"
}
LOGIN_ENDPOINT = "/api/auth/login"
EMAIL = "admin@barbearia-teste.com"
PASSWORD = "senha123"
TIMEOUT = 30


def test_login_with_email_and_password_authentication():
    url = BASE_URL + LOGIN_ENDPOINT
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"RequestException during login POST: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate required tokens in response
    assert "accessToken" in json_response, "Response JSON missing 'accessToken'"
    assert isinstance(json_response["accessToken"], str) and json_response["accessToken"], "'accessToken' is empty or not a string"
    assert "refreshToken" in json_response, "Response JSON missing 'refreshToken'"
    assert isinstance(json_response["refreshToken"], str) and json_response["refreshToken"], "'refreshToken' is empty or not a string"


test_login_with_email_and_password_authentication()