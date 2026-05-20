"""
AI 推理服务单元测试
使用 pytest + httpx
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


def test_health_check_no_model():
    """健康检查：模型文件不存在时返回 degraded"""
    with patch("os.path.exists", return_value=False):
        response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["model_exists"] is False
    assert data["status"] == "degraded"


def test_infer_file_not_found():
    """推理接口：文件不存在时返回 404"""
    response = client.post("/infer", json={
        "image_id": "test-uuid",
        "image_path": "/nonexistent/path/test.tif",
        "confidence_threshold": 0.5,
    })
    assert response.status_code in (404, 503)


def test_vegetation_index_missing_file():
    """植被指数接口：文件不存在时返回 404"""
    response = client.post("/vegetation-index", json={
        "image_id": "test-uuid",
        "image_path": "/nonexistent/test.tif",
        "indices": ["ndvi"],
    })
    assert response.status_code == 404
