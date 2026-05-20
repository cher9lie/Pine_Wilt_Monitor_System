"""
「松海护航」AI 推理微服务
FastAPI + ONNX Runtime（纯 CPU，ARM64）

模型文件路径（硬编码约定）：
    ai_service/models/yolov8_pine_best.onnx

启动命令：
    uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Tuple

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from inference import get_inference_engine, run_inference_on_tiff, YOLOv8ONNXInference

# ----------------------------------------------------------------
# 日志配置
# ----------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ----------------------------------------------------------------
# 应用生命周期：启动时加载模型
# ----------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动时预加载 ONNX 模型（避免首次推理延迟）"""
    logger.info("=" * 60)
    logger.info("松海护航 AI 推理服务启动")
    logger.info(f"模型路径：{settings.MODEL_PATH}")
    logger.info(f"置信度阈值：{settings.CONFIDENCE_THRESHOLD}")
    logger.info(f"推理设备：CPU (ARM64 CPUExecutionProvider)")
    logger.info("=" * 60)

    if os.path.exists(settings.MODEL_PATH):
        try:
            engine = get_inference_engine()
            logger.info("✅ ONNX 模型预加载成功")
        except Exception as e:
            logger.error(f"❌ 模型加载失败：{e}")
    else:
        logger.warning(
            f"⚠️  模型文件不存在：{settings.MODEL_PATH}\n"
            f"   请将 yolov8_pine_best.onnx 放置于 ai_service/models/ 目录后重启服务"
        )

    yield  # 应用运行中

    logger.info("AI 推理服务关闭")


# ----------------------------------------------------------------
# FastAPI 应用
# ----------------------------------------------------------------
app = FastAPI(
    title="松海护航 AI 推理服务",
    description="YOLOv8 ONNX Runtime CPU 推理，识别松材线虫病死木",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 仅内网调用，生产环境限制为 backend 服务 IP
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ----------------------------------------------------------------
# 请求/响应模型
# ----------------------------------------------------------------
class InferRequest(BaseModel):
    image_id: str = Field(..., description="数据库中的影像 ID（UUID）")
    image_path: str = Field(
        ...,
        description="服务器本地 TIFF 文件绝对路径，例如：/app/backend/uploads/tiffs/xxx.tif"
    )
    confidence_threshold: float = Field(
        default=0.5,
        ge=0.1,
        le=1.0,
        description="置信度阈值，低于此值的检测框丢弃"
    )


class DetectionFeature(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict


class GeoJSONCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[DetectionFeature]


class InferResponse(BaseModel):
    image_id: str
    detection_count: int
    geojson: dict  # GeoJSON FeatureCollection
    bbox: Optional[List[float]] = None  # [min_lng, min_lat, max_lng, max_lat]
    task_id: str
    message: str


class VegetationIndexRequest(BaseModel):
    image_id: str
    image_path: str
    indices: List[str] = Field(
        default=["ndvi"],
        description="需要计算的植被指数：ndvi / lai / sr"
    )


# ----------------------------------------------------------------
# 路由
# ----------------------------------------------------------------

@app.get("/health")
async def health_check():
    """
    健康检查接口
    检查模型文件是否存在、ONNX Runtime 是否就绪
    """
    model_exists = os.path.exists(settings.MODEL_PATH)
    model_loaded = False

    if model_exists:
        try:
            engine = get_inference_engine()
            model_loaded = engine.is_loaded
        except Exception:
            pass

    return {
        "status": "ok" if model_loaded else "degraded",
        "model_path": settings.MODEL_PATH,
        "model_exists": model_exists,
        "model_loaded": model_loaded,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "inference_device": "CPU (ARM64 CPUExecutionProvider)",
    }


@app.post("/infer", response_model=InferResponse)
async def infer(request: InferRequest):
    """
    执行 YOLOv8 ONNX 推理

    接收 Node.js 传来的 TIFF 文件路径，返回：
    - GeoJSON FeatureCollection（病死木点位，WGS84 坐标）
    - 影像地理范围 BBox
    - 检测数量

    Node.js 负责将 GeoJSON 写入 PostGIS disease_trees 表。
    """
    import uuid

    # 检查模型是否已加载
    if not os.path.exists(settings.MODEL_PATH):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODEL_NOT_READY",
                "message": f"模型文件不存在：{settings.MODEL_PATH}，请上传 yolov8_pine_best.onnx",
            }
        )

    # 检查 TIFF 文件是否存在
    if not os.path.exists(request.image_path):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "FILE_NOT_FOUND",
                "message": f"TIFF 文件不存在：{request.image_path}",
            }
        )

    try:
        engine = get_inference_engine()

        # 执行推理
        detections_geo, _, image_bbox = run_inference_on_tiff(
            image_path=request.image_path,
            confidence_threshold=request.confidence_threshold,
            inference_engine=engine,
        )

        # 构建 GeoJSON FeatureCollection
        # 坐标为 WGS84 (EPSG:4326)，Node.js 写入 PostGIS 时会转换为 CGCS2000 (EPSG:4490)
        features = []
        for det in detections_geo:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [det["lng"], det["lat"]],  # [longitude, latitude]
                },
                "properties": {
                    "confidence": round(det["confidence"], 4),
                    "class_label": det["class_label"],
                    "class_id": det["class_id"],
                    "severity": _confidence_to_severity(det["confidence"]),
                },
            })

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }

        task_id = str(uuid.uuid4())

        logger.info(
            f"Inference done | image_id={request.image_id} | "
            f"detections={len(features)} | task_id={task_id}"
        )

        return InferResponse(
            image_id=request.image_id,
            detection_count=len(features),
            geojson=geojson,
            bbox=list(image_bbox) if image_bbox else None,
            task_id=task_id,
            message=f"推理完成，识别到 {len(features)} 个疑似病死木",
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "FILE_NOT_FOUND", "message": str(e)})
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail={"code": "INFERENCE_ERROR", "message": str(e)})
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": f"推理失败：{str(e)}"}
        )


@app.post("/vegetation-index")
async def compute_vegetation_index(request: VegetationIndexRequest):
    """
    计算植被指数（NDVI / LAI / SR）
    预留接口，Task 5.7 完整实现

    NDVI = (NIR - Red) / (NIR + Red)
    SR   = NIR / Red
    LAI  = 基于 NDVI 的经验模型
    """
    if not os.path.exists(request.image_path):
        raise HTTPException(status_code=404, detail="TIFF 文件不存在")

    try:
        import rasterio
        import numpy as np

        results = {}

        with rasterio.open(request.image_path) as src:
            band_count = src.count

            if band_count < 4:
                return {
                    "image_id": request.image_id,
                    "message": f"影像波段数不足（{band_count}），NDVI 计算需要至少 4 波段（含 NIR）",
                    "indices": {},
                }

            # 假设波段顺序：1=Blue, 2=Green, 3=Red, 4=NIR（常见多光谱顺序）
            red = src.read(3).astype(np.float32)
            nir = src.read(4).astype(np.float32)

            # 避免除零
            eps = 1e-8

            if "ndvi" in request.indices:
                ndvi = (nir - red) / (nir + red + eps)
                ndvi = np.clip(ndvi, -1, 1)
                results["ndvi"] = {
                    "min": float(ndvi.min()),
                    "max": float(ndvi.max()),
                    "mean": float(ndvi.mean()),
                    "status": "computed",
                }

            if "sr" in request.indices:
                sr = nir / (red + eps)
                results["sr"] = {
                    "min": float(sr.min()),
                    "max": float(sr.max()),
                    "mean": float(sr.mean()),
                    "status": "computed",
                }

            if "lai" in request.indices and "ndvi" in results:
                # 简化 LAI 经验模型：LAI = -ln((0.69 - NDVI) / 0.59) / 0.91
                ndvi_val = (nir - red) / (nir + red + eps)
                ndvi_val = np.clip(ndvi_val, -0.68, 0.68)
                lai = -np.log((0.69 - ndvi_val) / 0.59 + eps) / 0.91
                lai = np.clip(lai, 0, 10)
                results["lai"] = {
                    "min": float(lai.min()),
                    "max": float(lai.max()),
                    "mean": float(lai.mean()),
                    "status": "computed",
                }

        return {
            "image_id": request.image_id,
            "indices": results,
            "message": "植被指数计算完成（统计值，完整栅格存储待 Task 5.7 实现）",
        }

    except Exception as e:
        logger.error(f"Vegetation index computation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------
# 工具函数
# ----------------------------------------------------------------
def _confidence_to_severity(confidence: float) -> int:
    """根据置信度映射病害严重程度（1:轻 2:中 3:重）"""
    if confidence >= 0.85:
        return 3  # 重
    elif confidence >= 0.65:
        return 2  # 中
    else:
        return 1  # 轻
