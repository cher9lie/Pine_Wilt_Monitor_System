# 代码库结构与维护指南

> 本文档供 AI 智能体或后续开发者快速理解项目结构、技术选型和模块职责。

---

## 1. 项目概览

**项目名称**：松海护航 — 松材线虫监测预警平台  
**技术栈**：Vue 3 + TypeScript（前端）| Node.js + Express + TypeScript（后端）| Python FastAPI + ONNX Runtime（AI推理）| PostgreSQL 15 + PostGIS 3.4（数据库）  
**部署目标**：ARM64 纯 CPU 容器化  
**坐标系**：CGCS2000 (EPSG:4490) 入库统一，前端展示 WGS84 (EPSG:4326)

---

## 2. 目录结构

```
Pine_Wilt_Monitor_System/
├── frontend/                  # Vue 3 前端 (Vite)
│   ├── src/
│   │   ├── api/               # Axios HTTP 封装 + 各模块 API
│   │   ├── assets/styles/     # 全局 CSS（深色主题 + Element Plus 覆盖）
│   │   ├── components/        # 共享组件
│   │   │   ├── map/           # MapLibre GL JS 地图容器
│   │   │   ├── charts/        # ECharts 植被指数图表
│   │   │   ├── upload/        # TIFF 上传组件
│   │   │   └── common/        # PageSkeleton 等通用组件
│   │   ├── layouts/           # MainLayout（导航+权限菜单）
│   │   ├── router/            # Vue Router + 路由守卫
│   │   ├── stores/            # Pinia（auth + map）
│   │   ├── types/             # TypeScript 类型定义
│   │   └── views/             # 页面视图（按模块划分）
│   │       ├── auth/          # 登录 + 注册
│   │       ├── dashboard/     # 态势大屏
│   │       ├── monitoring/    # 监测预警（4页）
│   │       ├── data-management/ # 数据管理（4页）
│   │       ├── biz-management/  # 业务管理（3页骨架）
│   │       ├── patrol/        # 巡护巡查（3页）
│   │       ├── finance/       # 财务管理（3页）
│   │       ├── report/        # 出图报告（3页）
│   │       ├── system/        # 系统管理（4页）
│   │       └── profile/       # 个人中心
│   └── public/                # 静态资源（favicon.ico, logo.png）
│
├── backend/                   # Node.js 后端 (Express + TypeScript)
│   ├── src/
│   │   ├── config/env.ts      # 环境变量加载
│   │   ├── middleware/        # JWT认证 + RBAC + 空间权限 + 错误处理 + traceId
│   │   ├── modules/
│   │   │   ├── auth/          # 登录/注册/刷新/登出/修改密码/个人信息
│   │   │   ├── rbac/          # 用户CRUD + 角色管理 + 审计日志查询
│   │   │   ├── ingest/        # TIFF上传 + 触发推理 + 影像管理 + IoT/地面数据
│   │   │   ├── alert/         # 预警列表/统计/灾情评估
│   │   │   └── patrol/        # 工单CRUD + 轨迹查询 + 巡护统计
│   │   ├── realtime/          # WebSocket 推流（预留）
│   │   ├── shared/            # PostgreSQL连接池 + Redis客户端 + Logger
│   │   └── app.ts             # Express 入口 + 路由注册 + 全局中间件
│   └── uploads/tiffs/         # TIFF 文件本地存储目录
│
├── ai_service/                # Python AI 推理微服务
│   ├── main.py                # FastAPI 入口（/health, /infer, /vegetation-index）
│   ├── inference.py           # YOLOv8 ONNX Runtime 推理引擎
│   ├── config.py              # 配置（模型路径、阈值等）
│   ├── utils/geo_utils.py     # 像素→地理坐标转换、NMS
│   ├── models/                # 放置 yolov8_pine_best.onnx 模型文件
│   └── requirements.txt       # Python 依赖
│
├── docker/                    # 容器编排
│   ├── docker-compose.yml     # 开发环境（PostgreSQL+PostGIS, Redis, MinIO, InfluxDB, EMQX）
│   ├── postgres/init.sql      # 数据库初始化（DDL + 角色 + 权限矩阵 + 示例账号）
│   └── nginx/                 # Nginx 配置（生产环境）
│
├── docs/                      # 文档
│   ├── ARCHITECTURE.md        # 系统架构蓝图
│   ├── DATABASE.md            # 数据库设计指南
│   ├── DEPLOY.md              # ARM64 部署规划
│   └── CODEBASE.md            # 本文件
│
└── .env                       # 环境变量（不入 Git）
```

---

## 3. 认证与权限体系

### JWT 认证流程
```
登录 → 签发 accessToken(15min) + refreshToken(7天)
     → accessToken 过期 → 前端 Axios 拦截器自动调 /auth/refresh
     → refreshToken 过期 → 跳转登录页
     → 登出 → accessToken jti 加入 Redis/内存黑名单
```

### RBAC 权限矩阵

| 层级 | 角色 | 可见菜单 |
|------|------|---------|
| 管控层 | admin | 全部 (*) |
| 管控层 | user_admin | 系统管理全部 |
| 管控层 | auditor | 日志审计 + 财务审计 |
| 操作层 | rs_engineer | 监测预警全部 + 数据管理(影像/地面/质量) |
| 操作层 | patrol_officer | 巡护巡查 + 灾情上报 |
| 管理层 | forest_manager | 预警/评估 + 业务管理 + 巡护 + 财务(采购/预算) + 报告 |
| 决策层 | bureau_leader | 态势大屏 + 预警/评估 + 出图报告(全部) |
| 访问层 | researcher | 态势大屏 + 影像库 + 数据集(脱敏) |

**实现方式**：
- 数据库 `permissions` 表存储 `role_id → resource_key(菜单路径) → action`
- 后端 `GET /auth/me` 返回 `allowedMenus` 数组
- 前端 `MainLayout.vue` 中 `hasMenuAccess()` 函数控制菜单显示/隐藏
- 后端各路由使用 `requireRole(...)` 中间件拦截

---

## 4. 核心数据流

### AI 识别链路
```
用户上传 TIFF → Node.js 存储到 backend/uploads/tiffs/
              → POST /infer 调用 Python FastAPI
              → ONNX Runtime CPU 推理 (yolov8_pine_best.onnx)
              → 返回 GeoJSON FeatureCollection (WGS84)
              → Node.js 批量 INSERT disease_trees (转为 CGCS2000)
              → 前端 MapLibre 自动更新图层
```

### 空间权限过滤
```
用户请求空间数据 → authenticate 中间件解析 JWT
                → spatialPermission 中间件从 DB 获取用户 spatial_boundary
                → 注入 ST_Contains(...) 过滤条件到查询
                → 返回仅该用户管辖范围内的数据
```

---

## 5. 模拟数据说明

所有模块在数据库为空时会返回模拟数据（`is_mock: true`），基于以下场景：
- **地理区域**：广东省清远市（后续切换为江西赣州市）
- **林场**：黄坌/横石塘/星子/太和/汤塘/大坪/源潭/吉田
- **时间线**：2024年9月 ~ 2025年1月
- **数据逻辑**：疫木数量与预警等级正相关，NDVI 变化与灾情负相关

---

## 6. 关键文件说明

| 文件 | 职责 | 修改注意事项 |
|------|------|-------------|
| `frontend/src/layouts/MainLayout.vue` | 全局布局 + 动态权限菜单 | 新增菜单项需同步更新 init.sql permissions |
| `frontend/src/router/index.ts` | 路由定义 + 守卫 | 新页面必须加 `meta: { requiresAuth: true }` |
| `frontend/src/assets/styles/global.css` | 全局深色主题 | Element Plus 组件样式覆盖在此 |
| `backend/src/app.ts` | Express 入口 | 新增路由模块在此注册 |
| `backend/src/middleware/authenticate.ts` | JWT + RBAC + 空间权限 | 核心安全逻辑 |
| `backend/src/shared/redis/client.ts` | Redis (可选，降级内存) | 生产环境需安装 Redis |
| `docker/postgres/init.sql` | 全量 DDL + 初始数据 | 修改角色/权限后需重建数据库 |
| `ai_service/inference.py` | ONNX 推理核心 | 模型输出格式依赖 YOLOv8 export |

---

## 7. 示例账号

| 用户名 | 密码 | 角色 | 用途 |
|--------|------|------|------|
| admin | Admin@2024 | 系统管理员 | 全部功能 |
| engineer | Test@2024 | 遥感工程师 | 监测+数据 |
| manager | Test@2024 | 林场管理员 | 业务+巡护 |
| leader | Test@2024 | 林业局领导 | 决策+报告 |
| researcher | Test@2024 | 科研人员 | 脱敏数据 |

---

## 8. 开发约定

- **命名**：文件 kebab-case，组件 PascalCase，变量 camelCase
- **API 响应格式**：`{ code: 'SUCCESS', data: ..., message?: string }`
- **错误格式**：`{ code: 'ERROR_CODE', message: string, traceId: string }`
- **空间数据**：入库 EPSG:4490，返回前端时 `ST_Transform(geom, 4326)`
- **新增模块步骤**：
  1. 后端：`backend/src/modules/{name}/{name}.router.ts` → 注册到 `app.ts`
  2. 前端：`frontend/src/views/{name}/` → 注册到 `router/index.ts`
  3. 权限：`init.sql` 中 permissions 表添加对应菜单权限 → 重建数据库
  4. 菜单：`MainLayout.vue` 中添加 `el-menu-item` + `v-if="hasMenuAccess(...)"`
