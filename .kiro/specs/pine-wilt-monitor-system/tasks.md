# Implementation Plan

## Overview

「松海护航」松材线虫监测预警平台第一阶段实现计划。聚焦核心监测预警流程、空间态势大屏及 RBAC 权限管控。技术栈：Vue 3 + TypeScript（前端）、Node.js + Express（后端）、Python FastAPI + ONNX Runtime（AI推理）、PostgreSQL + PostGIS（统一数据库）、ARM64 纯 CPU 部署。

## Tasks

- [ ] 1. 工程目录初始化与基础设施配置
  - [ ] 1.1 创建根目录工程结构（frontend/ backend/ ai_service/ docs/ docker/）
  - [ ] 1.2 初始化 frontend/：Vite + Vue 3 + TypeScript + Vue Router + Pinia + Element Plus
  - [ ] 1.3 初始化 backend/：Node.js + Express + TypeScript + pg（PostgreSQL 直连）
  - [ ] 1.4 初始化 ai_service/：Python FastAPI + ONNX Runtime + Rasterio + psycopg2
  - [ ] 1.5 创建 docker/docker-compose.yml（PostgreSQL+PostGIS、Redis、MinIO、EMQX）
  - [ ] 1.6 创建 docker/postgres/init.sql（PostGIS 扩展 + 全量 DDL 建表脚本）
  - [ ] 1.7 配置 .gitignore、.env.example、根目录 README.md
  - _Requirements: 工程结构规划，ARM64 容器化部署_

- [ ] 2. 数据库层：PostgreSQL + PostGIS 完整 DDL
  - [ ] 2.1 用户与权限表（users、roles、user_roles、permissions）
  - [ ] 2.2 空间核心表（forest_farms、forest_plots、disease_trees、alert_zones）
  - [ ] 2.3 遥感影像元数据表（remote_sensing_images，含 ndvi_path/lai_path/sr_path 字段）
  - [ ] 2.4 巡查与工单表（work_orders、patrol_tracks）
  - [ ] 2.5 IoT 设备表（iot_devices）
  - [ ] 2.6 审计日志表（audit_logs，含 SHA-256 链式哈希字段）
  - [ ] 2.7 创建所有 GIST 空间索引和业务索引
  - [ ] 2.8 插入初始角色数据（admin/forest_manager/patrol_officer/analyst/viewer）
  - _Requirements: 数据模型设计，PostGIS 空间字段，CGCS2000 EPSG:4490_

- [ ] 3. 后端：认证授权模块（Auth + RBAC）
  - [ ] 3.1 实现 POST /auth/login（bcrypt 验证 + JWT 签发，accessToken 15min + refreshToken 7天）
  - [ ] 3.2 实现 POST /auth/refresh（Refresh Token 轮换，旧 Token 写入 Redis 黑名单）
  - [ ] 3.3 实现 POST /auth/logout（清除 Redis 中的 Refresh Token）
  - [ ] 3.4 实现 JWT 验证中间件（验证签名 + 检查黑名单）
  - [ ] 3.5 实现 RBAC 权限中间件（角色-权限-资源三层校验）
  - [ ] 3.6 实现空间权限过滤中间件（ST_Contains 行级过滤，注入 spatialFilter 到查询）
  - [ ] 3.7 实现全局异常处理中间件（统一 ErrorResponse 格式，含 traceId）
  - [ ] 3.8 实现 GET /auth/me（返回当前用户信息 + 权限集 + 空间边界）
  - _Requirements: JWT 认证闭环，RBAC 权限管控，空间权限隔离_

- [ ] 4. 后端：数据采集与遥感影像管理模块
  - [ ] 4.1 实现 POST /api/images/upload（分片上传 GeoTIFF 到 MinIO，写入 remote_sensing_images 元数据）
  - [ ] 4.2 实现 GET /api/images（分页查询影像列表，支持时间/区域/状态筛选）
  - [ ] 4.3 实现 POST /api/images/:id/trigger-infer（触发 AI 推理，调用 Python FastAPI）
  - [ ] 4.4 实现 IoT 数据接入（EMQX MQTT 订阅，解析设备报文写入 iot_devices + InfluxDB）
  - [ ] 4.5 实现 GET /api/iot/devices（IoT 设备列表 + 实时状态）
  - _Requirements: 遥感影像数据管理，IoT 设备数据接入，MQTT 链路_

- [ ] 5. Python AI 推理微服务
  - [ ] 5.1 创建 ai_service/ 目录结构（main.py、models/、utils/、requirements.txt）
  - [ ] 5.2 实现模型加载（从 ai_service/models/yolov8_pine_best.onnx 加载，启动时检查文件存在性）
  - [ ] 5.3 实现 POST /infer（接收 image_path，执行 ONNX Runtime CPU 推理，返回检测框列表）
  - [ ] 5.4 实现坐标转换（像素坐标 → 地理坐标 CGCS2000 EPSG:4490，使用 Rasterio + GDAL）
  - [ ] 5.5 实现结果写入 PostGIS（批量 INSERT disease_trees，confidence >= 0.5 过滤）
  - [ ] 5.6 实现 GET /health（检查模型文件存在性 + ONNX Runtime 状态）
  - [ ] 5.7 实现 NDVI/LAI/SR 植被指数计算接口（POST /vegetation-index，结果存 MinIO）
  - _Requirements: YOLOv8 ONNX CPU 推理，坐标转换，植被指数接口预留_

- [ ] 6. 后端：监测预警模块（Alert 状态机）
  - [ ] 6.1 实现灾情等级评估函数（基于 disease_count + affected_area 的状态机规则）
  - [ ] 6.2 实现 POST /api/alerts/evaluate/:zoneId（触发预警等级重新评估）
  - [ ] 6.3 实现 GET /api/alerts（预警列表，支持等级/区域/时间筛选）
  - [ ] 6.4 实现 GET /api/alerts/:id（预警详情 + 关联疫木点位 GeoJSON）
  - [ ] 6.5 实现工单自动派发逻辑（预警触发后自动创建 work_orders，就近分配护林员）
  - [ ] 6.6 实现 WebSocket 推送（预警等级变更时向订阅客户端推送 alert.level_change 事件）
  - _Requirements: 预警-派发-处置全链条，状态机，WebSocket 推送_

- [ ] 7. 后端：WebSocket 实时推流服务
  - [ ] 7.1 实现 WebSocket 服务器（ws 库，连接鉴权：验证 JWT token 参数）
  - [ ] 7.2 实现主题订阅机制（客户端订阅 alert.*/patrol.*/workorder.*/iot.* 主题）
  - [ ] 7.3 实现消息优先级队列（critical > high > normal > low）
  - [ ] 7.4 实现心跳检测与断线重连（30s ping/pong，断线后补发离线消息）
  - [ ] 7.5 实现巡查轨迹实时推送（patrol.track_update，GPS 点位流）
  - _Requirements: 毫秒级 WebSocket 双向数据流推送_

- [ ] 8. 后端：巡护与工单管理模块
  - [ ] 8.1 实现 GET/POST /api/workorders（工单列表 + 创建）
  - [ ] 8.2 实现 PATCH /api/workorders/:id/status（工单状态流转：pending→assigned→in_progress→completed）
  - [ ] 8.3 实现 POST /api/workorders/:id/evidence（上传现场证据到 MinIO）
  - [ ] 8.4 实现 POST /api/patrol/track（护林员上报 GPS 轨迹点，Douglas-Peucker 压缩后写入 patrol_tracks）
  - [ ] 8.5 实现 GET /api/patrol/tracks（巡查轨迹查询，返回 GeoJSON LineString）
  - _Requirements: 移动端巡查轨迹追踪，处置状态回传，工单闭环_

- [ ] 9. 后端：空间数据查询 API
  - [ ] 9.1 实现 GET /api/spatial/disease-trees（疫木点位查询，支持 bbox/polygon 空间过滤 + 时间范围）
  - [ ] 9.2 实现 GET /api/spatial/forest-plots（林业小班查询，含风险等级）
  - [ ] 9.3 实现 GET /api/spatial/alert-zones（预警区域查询，含等级和统计数据）
  - [ ] 9.4 实现 GET /api/spatial/heatmap（疫木热力图数据，Kernel Density 聚合）
  - [ ] 9.5 实现 GET /api/spatial/vegetation-index/:imageId（植被指数图层 WMS 代理）
  - _Requirements: 矢量瓦片与高性能 WebGIS 渲染，空间查询接口_

- [ ] 10. 前端：工程基础配置
  - [ ] 10.1 配置 Vite + Vue 3 + TypeScript + Vue Router 4 + Pinia
  - [ ] 10.2 配置 Axios 实例（baseURL、请求拦截器注入 Bearer Token、响应拦截器处理 401 自动刷新）
  - [ ] 10.3 实现 useAuthStore（Pinia，存储 accessToken/refreshToken/user，实现 silentRefresh）
  - [ ] 10.4 实现 Vue Router 路由守卫（beforeEach：检查 Token 有效期，过期则静默刷新）
  - [ ] 10.5 配置全局错误处理（app.config.errorHandler + window.onerror）
  - [ ] 10.6 配置 Element Plus 主题（林业绿色主题，参考 HTML 布局结构）
  - _Requirements: 前端路由守卫，JWT 认证闭环，全局异常捕获_

- [ ] 11. 前端：登录页与布局框架
  - [ ] 11.1 实现登录页（/login，用户名/密码表单，调用 POST /auth/login）
  - [ ] 11.2 实现主布局（顶部导航栏 + 左侧图标菜单 + 主内容区，参考 HTML 布局）
  - [ ] 11.3 实现动态菜单（根据 RBAC 权限集动态渲染菜单树，隐藏无权限菜单项）
  - [ ] 11.4 实现用户信息下拉（头像 + 用户名 + 退出登录）
  - _Requirements: 基于 RBAC 的动态路由与菜单鉴权，响应式动态布局_

- [ ] 12. 前端：信息展板（态势大屏）
  - [ ] 12.1 实现 MapLibre GL JS 主地图容器（底图切换：卫星影像/地形图）
  - [ ] 12.2 实现疫木点位图层（GeoJSON Source，按 severity 分级设色，聚合显示）
  - [ ] 12.3 实现预警区域图层（Polygon，按 level 四色渲染：绿/黄/橙/红）
  - [ ] 12.4 实现林业小班图层（Polygon，按 risk_level 渐变色填充）
  - [ ] 12.5 实现图层控制面板（图层开关 + 透明度调节）
  - [ ] 12.6 实现时间轴组件（历史图层对比，支持按月/季/年切换）
  - [ ] 12.7 实现 ECharts 指标看板（健康占比饼图、疫木数量趋势折线图、区域排行柱状图）
  - [ ] 12.8 实现地图-图表联动（点击图表区域，地图飞行定位到对应林班）
  - [ ] 12.9 实现 WebSocket 连接（订阅 alert.* 主题，实时更新地图图层 + 预警弹窗）
  - _Requirements: 矢量瓦片与高性能 WebGIS 渲染，疫情动态流式可视化大屏_

- [ ] 13. 前端：监测预警模块
  - [ ] 13.1 实现影像上传页（拖拽上传 GeoTIFF，分片上传进度条，触发 AI 推理）
  - [ ] 13.2 实现 AI 推理结果展示（识别结果叠加在影像上，置信度标注）
  - [ ] 13.3 实现病死木交互式标绘工具（基于 MapLibre，点/面标注，属性编辑）
  - [ ] 13.4 实现预警列表页（等级筛选、时间筛选、分页，点击跳转地图定位）
  - [ ] 13.5 实现植被指数展示（NDVI/LAI/SR 图层切换，色带图例）
  - _Requirements: 单木级变色树冠识别，Web 端病死木交互式标绘，植被指数接口_

- [ ] 14. 前端：巡护与工单模块
  - [ ] 14.1 实现工单列表页（状态筛选、优先级排序、分配操作）
  - [ ] 14.2 实现工单详情页（任务描述、责任人、截止时间、现场证据预览）
  - [ ] 14.3 实现巡查轨迹地图展示（LineString 图层，实时轨迹更新）
  - _Requirements: 预警-派发-处置全链条业务闭环_

- [ ] 15. 前端：运维管理模块（RBAC 管理）
  - [ ] 15.1 实现用户管理页（用户列表、创建/编辑/冻结，空间边界地图绘制）
  - [ ] 15.2 实现角色权限管理页（角色列表、权限矩阵配置）
  - [ ] 15.3 实现审计日志页（操作日志查询，支持用户/时间/操作类型筛选）
  - _Requirements: 动态角色与权限矩阵分配，网格化空间权限隔离_

- [ ] 16. 架构文档生成
  - [ ] 16.1 生成 docs/ARCHITECTURE.md（系统架构图、数据流时序图、服务职责说明）
  - [ ] 16.2 生成 docs/DATABASE.md（完整 DDL、索引策略、坐标系规范、数据分层存储）
  - [ ] 16.3 生成 docs/DEPLOY.md（ARM64 镜像清单、Dockerfile、docker-compose.prod.yml、环境变量模板）
  - _Requirements: ARM64 容器化部署规划_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3, 10] },
    { "wave": 4, "tasks": [4, 11] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6, 9] },
    { "wave": 7, "tasks": [7, 8] },
    { "wave": 8, "tasks": [12, 13, 14, 15] },
    { "wave": 9, "tasks": [16] }
  ]
}
```

## Notes

- **模型文件路径**：用户在本地使用 RTX 3060 训练 YOLOv8 后，将导出的 `.onnx` 文件放置于 `ai_service/models/yolov8_pine_best.onnx`，服务器端仅做 CPU 推理，无需 GPU。
- **坐标系规范**：所有空间数据入库统一使用 CGCS2000（EPSG:4490），前端 MapLibre 展示时动态转换为 WGS84（EPSG:4326）。
- **数据库统一**：全栈使用 PostgreSQL + PostGIS，不引入 MySQL，业务数据与空间数据共用同一数据库实例，利用 PostgreSQL 原生事务保证一致性。
- **工作流引擎**：第一阶段不引入 Camunda，使用 Node.js 状态机 + `work_orders.status` 字段实现业务流转。
- **植被指数接口**：`remote_sensing_images` 表预留 `ndvi_path`、`lai_path`、`sr_path` 字段，Task 5.7 实现计算接口，Task 13.5 实现前端展示。
