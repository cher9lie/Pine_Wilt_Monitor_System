"""
地理坐标工具函数
- 像素坐标 → 地理坐标（WGS84）
- 坐标系转换辅助
"""
from typing import Tuple, List
import numpy as np


def pixel_to_geo(
    pixel_x: float,
    pixel_y: float,
    transform,  # rasterio.transform.Affine
) -> Tuple[float, float]:
    """
    将影像像素坐标转换为地理坐标（影像原始坐标系）

    Args:
        pixel_x: 列坐标（x）
        pixel_y: 行坐标（y）
        transform: rasterio 仿射变换矩阵

    Returns:
        (longitude, latitude) 地理坐标
    """
    # rasterio 仿射变换：geo = transform * (col, row)
    geo_x = transform.c + pixel_x * transform.a + pixel_y * transform.b
    geo_y = transform.f + pixel_x * transform.d + pixel_y * transform.e
    return float(geo_x), float(geo_y)


def bbox_pixel_to_geo(
    x1: float, y1: float, x2: float, y2: float,
    transform,
) -> Tuple[float, float, float, float]:
    """
    将检测框像素坐标（左上角+右下角）转换为地理坐标

    Returns:
        (min_lng, min_lat, max_lng, max_lat)
    """
    tl = pixel_to_geo(x1, y1, transform)
    br = pixel_to_geo(x2, y2, transform)
    min_lng = min(tl[0], br[0])
    max_lng = max(tl[0], br[0])
    min_lat = min(tl[1], br[1])
    max_lat = max(tl[1], br[1])
    return min_lng, min_lat, max_lng, max_lat


def center_pixel_to_geo(
    x1: float, y1: float, x2: float, y2: float,
    transform,
) -> Tuple[float, float]:
    """
    将检测框中心点像素坐标转换为地理坐标

    Returns:
        (center_lng, center_lat)
    """
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    return pixel_to_geo(cx, cy, transform)


def compute_image_bbox(
    width: int,
    height: int,
    transform,
) -> Tuple[float, float, float, float]:
    """
    计算整幅影像的地理范围 BBox

    Returns:
        (min_lng, min_lat, max_lng, max_lat)
    """
    corners = [
        pixel_to_geo(0, 0, transform),
        pixel_to_geo(width, 0, transform),
        pixel_to_geo(0, height, transform),
        pixel_to_geo(width, height, transform),
    ]
    lngs = [c[0] for c in corners]
    lats = [c[1] for c in corners]
    return min(lngs), min(lats), max(lngs), max(lats)


def nms_detections(
    detections: List[dict],
    iou_threshold: float = 0.5,
) -> List[dict]:
    """
    非极大值抑制（NMS）：去除重叠检测框
    用于瓦片拼接后去除边界重复检测

    Args:
        detections: [{"bbox": [x1,y1,x2,y2], "confidence": float, ...}]
        iou_threshold: IoU 阈值

    Returns:
        过滤后的检测列表
    """
    if not detections:
        return []

    boxes = np.array([[d["bbox"][0], d["bbox"][1], d["bbox"][2], d["bbox"][3]] for d in detections])
    scores = np.array([d["confidence"] for d in detections])

    # 按置信度降序排列
    order = scores.argsort()[::-1]
    keep = []

    while order.size > 0:
        i = order[0]
        keep.append(i)

        if order.size == 1:
            break

        # 计算 IoU
        xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0])
        yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
        xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2])
        yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h

        area_i = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
        area_j = (boxes[order[1:], 2] - boxes[order[1:], 0]) * \
                 (boxes[order[1:], 3] - boxes[order[1:], 1])
        iou = inter / (area_i + area_j - inter + 1e-6)

        order = order[1:][iou <= iou_threshold]

    return [detections[i] for i in keep]
