from fastapi.testclient import TestClient

from backend import files


def test_download_existing_file_returns_content(tmp_path, monkeypatch):
    monkeypatch.setattr(files, "DOWNLOAD_DIR", tmp_path.resolve())
    sample = tmp_path / "sample.txt"
    sample.write_text("hello-download", encoding="utf-8")
    client = TestClient(files.app)

    response = client.get("/download/sample.txt")

    assert response.status_code == 200
    assert response.text == "hello-download"
    assert 'filename="sample.txt"' in response.headers.get("content-disposition", "")


def test_download_missing_file_returns_404(tmp_path, monkeypatch):
    monkeypatch.setattr(files, "DOWNLOAD_DIR", tmp_path.resolve())
    client = TestClient(files.app)

    response = client.get("/download/missing.txt")

    assert response.status_code == 404
    assert response.json() == {"detail": "File not found"}


def test_download_invalid_filename_returns_400(tmp_path, monkeypatch):
    monkeypatch.setattr(files, "DOWNLOAD_DIR", tmp_path.resolve())
    client = TestClient(files.app)

    # URL-encode ".." so it reaches the route handler as filename="..".
    response = client.get("/download/%2e%2e")

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid filename"}
