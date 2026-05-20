"""
YOLOv8 ONNX Runtime 推理引擎
- 纯 CPU 推理（CPUExecutionProvider）
- 支持大幅 GeoTIFF 瓦片化推理
- 推理结果转换为 GeoJSON FeatureCollection
"""
import os
import logging
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import onnxruntime as ort
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform_bounds

from config import settings
from utils.geo_utils import (
    center_pixel_to_geo,
    compute_image_bbox,
    nms_detections,
)

logger = logging.getLogger(__name__)

# YOLOv8 类别映射
# 如果使用自定义训练模型：0=dead_tree, 1=discolored, 2=suspected
# 如果使用通用 COCO 预训练模型（80类），将所有检测结果统一映射为 suspected
# 后续替换为自训练松材线虫专用模型后，改回 3 类映射即可
USING_CUSTOM_MODEL = False  # ← 改为 True 当你使用自训练模型时

if USING_CUSTOM_MODEL:
    CLASS_LABELS = {
        0: "dead_tree",
        1: "discolored",
        2: "suspected",
    }
else:
    # 通用模型：所有检测结果视为 "suspected"（疑似），人工后续复核
    CLASS_LABELS = {i: "suspected" for i in range(80)}


class YOLOv8ONNXInference:
    """
    YOLOv8 ONNX Runtime 推理器
    模型文件路径：ai_service/models/yolov8_pine_best.onnx
    """

    def __init__(self):
        self._session: Optional[ort.InferenceSession] = None
        self._model_path = settings.MODEL_PATH
        self._input_size = settings.MODEL_INPUT_SIZE

    def load_model(self) -> None:
        """
        加载 ONNX 模型
        使用 CPUExecutionProvider（ARM64 纯 CPU，无 GPU）
        """
        if not os.path.exists(self._model_path):
            raise FileNotFoundError(
                f"模型文件不存在：{self._model_path}\n"
                f"请将训练好的 yolov8_pine_best.onnx 放置于 ai_service/models/ 目录"
            )

        logger.info(f"Loading ONNX model from: {self._model_path}")

        # 明确指定 CPU Provider（ARM64 无 GPU）
        providers = ["CPUExecutionProvider"]

        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        # ARM64 CPU 线程数（根据服务器核心数调整）
        sess_options.intra_op_num_threads = os.cpu_count() or 4
        sess_options.inter_op_num_threads = 2

        self._session = ort.InferenceSession(
            self._model_path,
            sess_options=sess_options,
            providers=providers,
        )

        # 获取模型输入信息
        input_info = self._session.get_inputs()[0]
        logger.info(
            f"Model loaded successfully | "
            f"Input: {input_info.name} {input_info.shape} | "
            f"Provider: {self._session.get_providers()}"
        )

    @property
    def is_loaded(self) -> bool:
        return self._session is not None

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        图像预处理：resize → normalize → CHW → batch

        Args:
            image: HWC uint8 numpy array (RGB)

        Returns:
            NCHW float32 array，值域 [0, 1]
        """
        from PIL import Image as PILImage

        # Resize 到模型输入尺寸（保持比例，填充灰色）
        h, w = image.shape[:2]
        scale = self._input_size / max(h, w)
        new_h, new_w = int(h * scale), int(w * scale)

        pil_img = PILImage.fromarray(image).resize((new_w, new_h), PILImage.BILINEAR)

        # 创建灰色填充画布
        canvas = np.full((self._input_size, self._input_size, 3), 114, dtype=np.uint8)
        canvas[:new_h, :new_w] = np.array(pil_img)

        # HWC → CHW → NCHW，归一化到 [0, 1]
        tensor = canvas.transpose(2, 0, 1).astype(np.float32) / 255.0
        tensor = np.expand_dims(tensor, axis=0)  # (1, 3, H, W)

        return tensor, scale, new_h, new_w

    def postprocess(
        self,
        output: np.ndarray,
        scale: float,
        orig_h: int,
        orig_w: int,
        confidence_threshold: float,
    ) -> List[dict]:
        """
        YOLOv8 输出后处理
        YOLOv8 ONNX 输出格式：(1, num_classes+4, num_anchors)

        Returns:
            [{"bbox": [x1,y1,x2,y2], "confidence": float, "class_id": int, "class_label": str}]
        """
        # output shape: (1, 4+num_classes, 8400) for YOLOv8
        predictions = output[0]  # (4+num_classes, 8400)
        predictions = predictions.T   # (8400, 4+num_classes)

        # 分离 bbox 和 class scores
        boxes = predictions[:, :4]       # cx, cy, w, h（归一化）
        class_scores = predictions[:, 4:]  # (8400, num_classes)

        # 取最大类别置信度
        confidences = class_scores.max(axis=1)
        class_ids = class_scores.argmax(axis=1)

        # 置信度过滤
        mask = confidences >= confidence_threshold
        boxes = boxes[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        if len(boxes) == 0:
            return []

        # cx,cy,w,h → x1,y1,x2,y2（绝对像素坐标，YOLOv8 输出已是绝对值）
        cx, cy, w, h = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        # 还原到原始影像像素坐标（从 input_size 空间还原）
        x1 = x1 / scale
        y1 = y1 / scale
        x2 = x2 / scale
        y2 = y2 / scale

        # 裁剪到影像边界
        x1 = np.clip(x1, 0, orig_w)
        y1 = np.clip(y1, 0, orig_h)
        x2 = np.clip(x2, 0, orig_w)
        y2 = np.clip(y2, 0, orig_h)

        detections = []
        for i in range(len(boxes)):
            detections.append({
                "bbox": [float(x1[i]), float(y1[i]), float(x2[i]), float(y2[i])],
                "confidence": float(confidences[i]),
                "class_id": int(class_ids[i]),
                "class_label": CLASS_LABELS.get(int(class_ids[i]), "suspected"),
            })

        return detections

    def infer_tile(
        self,
        tile: np.ndarray,
        confidence_threshold: float,
    ) -> List[dict]:
        """
        对单个瓦片执行推理

        Args:
            tile: HWC uint8 RGB numpy array
            confidence_threshold: 置信度阈值

        Returns:
            检测结果列表
        """
        if self._session is None:
            raise RuntimeError("模型未加载，请先调用 load_model()")

        orig_h, orig_w = tile.shape[:2]
        tensor, scale, new_h, new_w = self.preprocess(tile)

        # ONNX Runtime 推理（CPU）
        input_name = self._session.get_inputs()[0].name
        outputs = self._session.run(None, {input_name: tensor})

        return self.postprocess(outputs[0], scale, orig_h, orig_w, confidence_threshold)


def run_inference_on_tiff(
    image_path: str,
    confidence_threshold: float = 0.5,
    inference_engine: Optional[YOLOv8ONNXInference] = None,
) -> Tuple[list, list, Optional[Tuple[float, float, float, float]]]:
    """
    对 GeoTIFF 文件执行完整推理流程：
    1. 读取影像（支持多波段，取 RGB 三波段）
    2. 瓦片化切分（TILE_SIZE x TILE_SIZE，带重叠）
    3. 逐瓦片推理
    4. 坐标还原到全图像素坐标
    5. NMS 去重
    6. 像素坐标 → 地理坐标（WGS84）

    Returns:
        (detections_geo, detections_pixel, image_bbox)
        - detections_geo: 地理坐标检测结果列表
        - detections_pixel: 像素坐标检测结果列表（调试用）
        - image_bbox: 影像地理范围 (min_lng, min_lat, max_lng, max_lat)
    """
    if inference_engine is None or not inference_engine.is_loaded:
        raise RuntimeError("推理引擎未初始化")

    logger.info(f"Starting inference on: {image_path}")

    with rasterio.open(image_path) as src:
        width = src.width
        height = src.height
        transform = src.transform
        crs = src.crs

        logger.info(f"Image info: {width}x{height}, CRS: {crs}, Bands: {src.count}")

        # 读取 RGB 波段（假设波段顺序为 R,G,B 或取前3波段）
        band_count = min(src.count, 3)
        if band_count < 3:
            # 单波段影像（灰度），复制为 3 通道
            band = src.read(1)
            image_data = np.stack([band, band, band], axis=-1)
        else:
            # 读取前3波段，转为 HWC
            bands = src.read([1, 2, 3])  # CHW
            image_data = bands.transpose(1, 2, 0)  # HWC

        # 归一化到 uint8（遥感影像可能是 uint16）
        if image_data.dtype != np.uint8:
            # 线性拉伸到 0-255
            img_min, img_max = image_data.min(), image_data.max()
            if img_max > img_min:
                image_data = ((image_data - img_min) / (img_max - img_min) * 255).astype(np.uint8)
            else:
                image_data = np.zeros_like(image_data, dtype=np.uint8)

        # 计算影像地理范围
        image_bbox = compute_image_bbox(width, height, transform)

        # 若影像 CRS 不是 WGS84，转换 bbox 到 WGS84
        if crs and not crs.is_geographic:
            try:
                wgs84 = CRS.from_epsg(4326)
                min_lng, min_lat, max_lng, max_lat = transform_bounds(
                    crs, wgs84, *image_bbox
                )
                image_bbox = (min_lng, min_lat, max_lng, max_lat)
            except Exception as e:
                logger.warning(f"CRS transform failed: {e}, using raw coordinates")

        # 瓦片化推理
        tile_size = settings.TILE_SIZE
        overlap = settings.TILE_OVERLAP
        step = tile_size - overlap

        all_detections_pixel = []

        for row_start in range(0, height, step):
            for col_start in range(0, width, step):
                row_end = min(row_start + tile_size, height)
                col_end = min(col_start + tile_size, width)

                tile = image_data[row_start:row_end, col_start:col_end]

                # 跳过过小的瓦片
                if tile.shape[0] < 32 or tile.shape[1] < 32:
                    continue

                tile_detections = inference_engine.infer_tile(tile, confidence_threshold)

                # 将瓦片内像素坐标还原到全图像素坐标
                for det in tile_detections:
                    det["bbox"][0] += col_start
                    det["bbox"][1] += row_start
                    det["bbox"][2] += col_start
                    det["bbox"][3] += row_start
                    all_detections_pixel.append(det)

        logger.info(f"Raw detections before NMS: {len(all_detections_pixel)}")

        # NMS 去重（处理瓦片重叠区域的重复检测）
        all_detections_pixel = nms_detections(all_detections_pixel, iou_threshold=0.5)

        logger.info(f"Detections after NMS: {len(all_detections_pixel)}")

        # 像素坐标 → 地理坐标（WGS84）
        detections_geo = []
        for det in all_detections_pixel:
            x1, y1, x2, y2 = det["bbox"]

            # 中心点地理坐标（影像原始 CRS）
            geo_x, geo_y = center_pixel_to_geo(x1, y1, x2, y2, transform)

            # 若非 WGS84，转换到 WGS84
            if crs and not crs.is_geographic:
                try:
                    from pyproj import Transformer
                    transformer = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
                    lng, lat = transformer.transform(geo_x, geo_y)
                except Exception:
                    lng, lat = geo_x, geo_y
            else:
                lng, lat = geo_x, geo_y

            detections_geo.append({
                **det,
                "lng": lng,
                "lat": lat,
            })

    logger.info(f"Inference completed: {len(detections_geo)} detections, bbox={image_bbox}")
    return detections_geo, all_detections_pixel, image_bbox


# 全局推理引擎单例（应用启动时加载一次）
_inference_engine: Optional[YOLOv8ONNXInference] = None


def get_inference_engine() -> YOLOv8ONNXInference:
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = YOLOv8ONNXInference()
        _inference_engine.load_model()
    return _inference_engine
