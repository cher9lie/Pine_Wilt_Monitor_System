# 「松海护航」松材线虫监测预警平台

基于 Vue 3 + Node.js + Python FastAPI + PostgreSQL/PostGIS 的全栈 Web GIS 监测预警平台，支持 ARM64 纯 CPU 容器化部署。

## 项目简介

「松海护航」是一个面向林业管理的智能监测预警平台，集成了遥感影像AI识别、GIS空间分析、IoT设备接入、巡查工单管理等核心功能。平台采用前后端分离架构，支持多角色权限控制，适用于各级林业管理部门。

### 核心功能

- **监测预警**：遥感影像上传、AI自动识别病死木、预警区域动态评估
- **数据管理**：影像库管理、地面数据采集、数据质量控制
- **业务管理**：巡查任务派发、灾情上报、资源调度
- **巡护巡查**：巡护规划、轨迹记录、病死木标绘
- **出图报告**：地图集制作、灾情报告生成
- **系统管理**：用户权限、角色管理、审计日志

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

- [架构蓝图](docs/ARCHITECTURE.md) - 系统架构与数据流设计
- [数据库设计](docs/DATABASE.md) - PostgreSQL+PostGIS 表结构设计
- [部署规划](docs/DEPLOY.md) - ARM64 容器化部署指南
- [代码库维护指南](docs/CODEBASE.md) - 开发约定与模块说明
- [变更日志](docs/CHANGELOG.md) - 版本更新记录

## 测试账号

| 用户名 | 密码 | 角色 | 用途 |
|--------|------|------|------|
| admin | Admin@2024 | 系统管理员 | 全部功能 |
| engineer | Test@2024 | 遥感工程师 | 监测+数据 |
| manager | Test@2024 | 林场管理员 | 业务+巡护 |
| leader | Test@2024 | 林业局领导 | 决策+报告 |
| researcher | Test@2024 | 科研人员 | 脱敏数据 |

## 开发指南

### 分支管理

- `main` - 生产分支，稳定版本
- `develop` - 开发分支，新功能合并

### 提交规范

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 许可证

MIT License

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request
