# 「松海护航」全栈架构蓝图

> 版本：v1.0 | 阶段：第一阶段（监测预警核心流程）| 部署目标：ARM64 纯 CPU

---

## 1. 系统总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          客 户 端 层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ PC 管理端     │  │ 移动巡查端    │  │      大屏展示端            │  │
│  │ Vue3+Vite    │  │ PWA          │  │  Vue3 全屏布局             │  │
│  │ MapLibre GL  │  │ MapLibre GL  │  │  ECharts + MapLibre       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼──────────────────────┼─────────────────┘
          │  HTTPS / WSS    │                       │
┌─────────▼─────────────────▼───────────────────────▼─────────────────┐
│                    接 入 层  (Nginx 1.25 ARM64)                       │
│  • 反向代理 / SSL 终止 (TLS 1.3)                                      │
│  • 静态资源服务 (frontend/dist)                                        │
│  • WebSocket 代理 (Upgrade: websocket)                               │
│  • 限流 (limit_req_zone)                                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼──────┐  ┌──────────▼──────┐  ┌─────────▼──────────┐
│  Node.js 后端   │  │ Python AI 微服务 │  │  EMQX MQTT Broker  │
│  Express+TS    │  │ FastAPI+ONNX    │  │  (IoT 设备接入)     │
│  :3000         │  │ :8000           │  │  :1883 / :8083     │
└─────────┬──────┘  └──────────┬──────┘  └─────────┬──────────┘
          │                    │                    │
┌─────────▼────────────────────▼────────────────────▼──────────────────┐
│                          数 据 层                                      │
│  ┌─────────────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ PostgreSQL 15        │  │ Redis 7  │  │  MinIO   │  │InfluxDB2 │  │
│  │ + PostGIS 3.4        │  │ 缓存/会话 │  │ 对象存储  │  │ IoT时序  │  │
│  │ 统一业务+空间数据库   │  │ /限流    │  │ 影像/附件 │  │ 数据     │  │
│  └─────────────────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心数据流：AI 识别结果落库与实时推送

```
用户上传影像
     │
     ▼ POST /api/images/upload
Node.js Ingest-Service
     │ 1. 存储 GeoTIFF → MinIO (remote-sensing-images bucket)
     │ 2. 写入 remote_sensing_images 元数据 → PostgreSQL
     │ 3. 调用 AI 服务
     ▼ POST http://ai_service:8000/infer
Python FastAPI 推理服务
     │ 1. 从 MinIO 下载影像
     │ 2. 加载 ai_service/models/yolov8_pine_best.onnx
     │ 3. ONNX Runtime CPUExecutionProvider 推理
     │ 4. 像素坐标 → 地理坐标 (Rasterio, CGCS2000 EPSG:4490)
     │ 5. 批量 INSERT disease_trees (confidence >= 0.5)
     │ 6. 返回 {detection_count, task_id}
     ▼
Node.js Alert-Service (evaluateAlert)
     │ 1. SELECT COUNT + ST_Intersects → 统计受影响区域
     │ 2. 状态机规则判定等级 (green/yellow/orange/red)
     │ 3. UPDATE alert_zones SET level = ?
     │ 4. 触发工单自动派发 (INSERT work_orders)
     ▼
Node.js Realtime-Service (WebSocket)
     │ emit('alert.level_change', {zone_id, level, geojson})
     ▼
前端 Vue3 + MapLibre GL JS
     │ 1. 更新 disease_trees GeoJSON Source
     │ 2. 更新 alert_zones Polygon 图层颜色
     │ 3. 弹出预警通知
```

---

## 3. JWT 认证与 RBAC 鉴权流程

```
前端发起请求
     │
     ▼ Vue Router beforeEach
检查 accessToken 有效期
     ├── 未过期 → 继续
     └── 已过期 → POST /auth/refresh → 获取新 TokenPair → 继续
     │
     ▼ Axios 请求拦截器
注入 Authorization: Bearer <accessToken>
     │
     ▼ Nginx → Node.js
JWT 验证中间件
     ├── 验证签名 (HS256)
     ├── 检查 Redis 黑名单 (jti)
     └── 解析 userId, roles, spatialBoundary
     │
     ▼ RBAC 权限中间件
检查 API 路由权限
     ├── 无权限 → 403 FORBIDDEN
     └── 有权限 → 继续
     │
     ▼ 空间权限过滤中间件
若 spatialBoundary != NULL:
     注入 WHERE ST_Contains($boundary, geom) 到所有空间查询
     │
     ▼ 业务 API Handler
执行业务逻辑，返回符合权限的数据
```

---

## 4. IoT 设备数据接入链路

```
野外设备 (松墨天牛诱捕器 / 气象站 / 土壤传感器)
     │ MQTT over 4G/NB-IoT
     ▼ EMQX Broker :1883
主题规范: pine/iot/{device_code}/{data_type}
     │ EMQX Rule Engine → HTTP Bridge
     ▼ Node.js Ingest-Service /api/iot/ingest
     │ 1. 解析报文 (设备编号, 时间戳, 传感器数据)
     │ 2. 写入 InfluxDB (时序数据)
     │ 3. UPDATE iot_devices SET status, last_heartbeat, battery_pct
     │ 4. 若设备离线超过阈值 → 触发告警
     ▼ WebSocket Realtime-Service
emit('iot.device_heartbeat', {device_id, status, battery_pct})
     ▼ 前端地图 IoT 设备图层
实时更新设备状态图标颜色 (绿=在线 / 红=离线)
```

---

## 5. 遥感影像处理链路

```
影像来源: 高分二号(2m) / 高分七号(0.8m) / Sentinel-2(10m) / 无人机DOM
     │
     ▼ POST /api/images/upload (分片上传)
Node.js Ingest-Service
     │ 存储原始影像 → MinIO raw-images/
     │ 写入 remote_sensing_images (status='uploaded')
     ▼
POST /api/images/:id/trigger-infer
     │ 调用 Python FastAPI POST /preprocess
     ▼ Python 遥感预处理
     │ 1. GDAL 读取元数据 (传感器/云量/分辨率)
     │ 2. gdalwarp 重投影 → CGCS2000 (EPSG:4490)
     │ 3. 云掩膜处理 (云覆盖 > 20% 则拒绝)
     │ 4. 计算植被指数:
     │    NDVI = (NIR - Red) / (NIR + Red)
     │    LAI  = 基于 NDVI 的经验模型
     │    SR   = NIR / Red
     │ 5. 存储植被指数 GeoTIFF → MinIO vegetation-index/
     │ 6. 更新 remote_sensing_images (ndvi_path, lai_path, sr_path, status='ready')
     ▼
POST /infer (YOLOv8 ONNX 推理)
     │ 影像切片 (256x256 瓦片) → 批量推理 → 结果写入 disease_trees
     ▼
UPDATE remote_sensing_images SET status='inferred'
```

---

## 6. 服务职责边界

| 服务 | 语言/框架 | 端口 | 职责 |
|------|----------|------|------|
| Nginx | - | 80/443 | 反向代理、SSL、静态资源、WS代理 |
| Node.js Backend | Express+TS | 3000 | 业务编排、认证、RBAC、API、WebSocket |
| Python AI Service | FastAPI | 8000 | ONNX推理、遥感预处理、植被指数计算 |
| EMQX | - | 1883/8083 | MQTT Broker，IoT设备接入 |
| PostgreSQL+PostGIS | - | 5432 | 统一业务数据库+空间数据库 |
| Redis | - | 6379 | JWT黑名单、会话缓存、限流计数器 |
| MinIO | - | 9000/9001 | 遥感影像、植被指数GeoTIFF、巡查附件 |
| InfluxDB | - | 8086 | IoT传感器时序数据 |

---

## 7. Kafka 主题规范（预留，第二阶段启用）

| 主题 | 生产者 | 消费者 | 说明 |
|------|--------|--------|------|
| `pine.alert.new_detection` | AI Service | Alert Service | 新疫木检测事件 |
| `pine.alert.level_change` | Alert Service | Realtime Service | 预警等级变更 |
| `pine.patrol.track_update` | Patrol Service | Realtime Service | 巡查轨迹更新 |
| `pine.workorder.status` | BizMgmt Service | Realtime Service | 工单状态变更 |
| `pine.iot.heartbeat` | Ingest Service | Realtime Service | IoT设备心跳 |

> 第一阶段使用 Redis Pub/Sub 替代 Kafka，降低部署复杂度。

---

## 8. 断层修复摘要

| 断层 | 修复方案 |
|------|---------|
| A: AI结果落库推送链路 | FastAPI推理→psycopg2写PostGIS→Redis Pub/Sub→WebSocket推前端 |
| B: JWT认证闭环 | Vue Router守卫+Axios拦截器+后端三层中间件+Redis黑名单 |
| C: 坐标系转换时机 | Python服务入口统一gdalwarp转CGCS2000，GPS坐标在Ingest-Service转换 |
| D: 全局异常捕获 | process.uncaughtException+Express全局中间件+统一ErrorResponse格式 |
| E: 跨库事务 | 统一PostgreSQL，原生事务，无跨库问题 |
| F: ARM64适配 | 所有镜像选用官方ARM64支持版本，Python使用onnxruntime-aarch64 |
| G: IoT MQTT链路 | EMQX+Rule Engine→HTTP Bridge→Ingest-Service→InfluxDB |
| H: 植被指数接口 | remote_sensing_images预留ndvi/lai/sr_path字段，Python计算后存MinIO |
