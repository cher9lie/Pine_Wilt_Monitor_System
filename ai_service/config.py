"""
AI 推理服务配置
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

# 项目根目录（ai_service/ 的父目录）
BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    # ----------------------------------------------------------------
    # 模型文件路径（硬编码为约定位置）
    # 用户在本地 RTX 3060 训练完成后，将 .onnx 文件放置于此路径
    # ----------------------------------------------------------------
    MODEL_PATH: str = str(BASE_DIR / "models" / "yolov8_pine_best.onnx")

    # 推理置信度阈值（低于此值的检测框丢弃）
    CONFIDENCE_THRESHOLD: float = 0.5

    # YOLOv8 输入尺寸（训练时使用的 imgsz）
    MODEL_INPUT_SIZE: int = 640

    # PostgreSQL 连接（用于直接写入 disease_trees）
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://pine_user:pine_dev_password@localhost:5432/pine_wilt_db"
    )

    # MinIO / 本地存储
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "pine_admin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "pine_minio_dev")

    # 推理时瓦片切分大小（像素）
    TILE_SIZE: int = 640
    TILE_OVERLAP: int = 64  # 瓦片重叠像素，防止边界漏检

    class Config:
        env_file = str(BASE_DIR.parent / ".env")
        extra = "ignore"


settings = Settings()
