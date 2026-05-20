# 「松海护航」松材线虫监测预警平台

基于 Vue 3 + Node.js + Python FastAPI + PostgreSQL/PostGIS 的全栈 Web GIS 监测预警平台，支持 ARM64 纯 CPU 容器化部署。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + MapLibre GL JS + ECharts + Element Plus |
| 后端 | Node.js + Express + TypeScript |
| AI 推理 | Python FastAPI + ONNX Runtime (CPU) + Rasterio/GDAL |
| 数据库 | PostgreSQL 15 + PostGIS 3.4（统一业务+空间数据） |
| 缓存 | Redis 7 |
| 对象存储 | MinIO |
| IoT 接入 | EMQX MQTT Broker |
| 时序数据 | InfluxDB 2 |
| 部署 | Docker + Docker Compose（ARM64 aarch64） |

## 目录结构

```
├── frontend/          # Vue 3 前端
├── backend/           # Node.js 后端
├── ai_service/        # Python AI 推理微服务
│   └── models/        # 放置 yolov8_pine_best.onnx
├── docs/              # 架构文档
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DEPLOY.md
├── docker/            # Docker 配置
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   └── postgres/init.sql
└── .env.example       # 环境变量模板
```

## 快速启动

```bash
# 1. 复制环境变量
cp .env.example .env
# 编辑 .env 填写密码

# 2. 启动基础设施
cd docker && docker compose up -d

# 3. 后端
cd backend && npm install && npm run dev

# 4. AI 服务（需先放置模型文件到 ai_service/models/）
cd ai_service && pip install -r requirements.txt && uvicorn main:app --reload

# 5. 前端
cd frontend && npm install && npm run dev
```

## AI 模型部署

在本地使用 RTX 3060 训练 YOLOv8 后：
```bash
# 导出 ONNX 格式
yolo export model=best.pt format=onnx opset=12

# 放置到指定路径
cp best.onnx ai_service/models/yolov8_pine_best.onnx
```

## 文档

- [架构蓝图](docs/ARCHITECTURE.md)
- [数据库设计](docs/DATABASE.md)
- [部署规划](docs/DEPLOY.md)
