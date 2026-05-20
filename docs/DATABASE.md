# 空间数据库设计指南

> 数据库：PostgreSQL 15 + PostGIS 3.4（统一业务数据库 + 空间数据库）
> 坐标系：CGCS2000 EPSG:4490（入库统一标准）

---

## 1. 数据库选型说明

| 存储引擎 | 用途 | 理由 |
|---------|------|------|
| PostgreSQL 15 + PostGIS 3.4 | 业务数据 + 空间数据（统一） | 原生事务保证一致性，ST_* 空间函数，GIST 索引 |
| Redis 7 | JWT黑名单、会话缓存、限流计数器、WS连接状态 | 高性能内存存储，TTL 自动过期 |
| MinIO | 遥感影像GeoTIFF、植被指数栅格、巡查照片/视频 | S3兼容，ARM64官方支持，分片上传 |
| InfluxDB 2 | IoT传感器时序数据（温湿度/虫口密度/气象） | 时序优化，高频写入，时间范围查询 |

---

## 2. 坐标系规范

```
数据来源          原始坐标系        入库坐标系         前端展示
─────────────────────────────────────────────────────────────
高分卫星影像      CGCS2000(4490)   CGCS2000(4490)    WGS84(4326)
Sentinel-2       WGS84(4326)      CGCS2000(4490)    WGS84(4326)
无人机DOM         WGS84(4326)      CGCS2000(4490)    WGS84(4326)
护林员GPS         WGS84(4326)      CGCS2000(4490)    WGS84(4326)
IoT设备坐标       WGS84(4326)      CGCS2000(4490)    WGS84(4326)
```

**转换规则**：
- Python 服务：`gdalwarp -t_srs EPSG:4490`
- Node.js 服务：`ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 4490)`
- 前端展示：MapLibre GL JS 自动处理 EPSG:4490 → EPSG:4326 的坐标转换

---

## 3. 完整 DDL（PostgreSQL + PostGIS）

### 3.1 扩展初始化

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 模糊搜索支持
```

### 3.2 用户与权限体系

```sql
-- 用户表
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(50) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,          -- bcrypt, cost=12
    email            VARCHAR(100),
    phone            VARCHAR(20),
    real_name        VARCHAR(50),
    department       VARCHAR(100),
    status           VARCHAR(20) DEFAULT 'active'    -- active/frozen/archived
                     CHECK (status IN ('active','frozen','archived')),
    spatial_boundary GEOMETRY(Polygon, 4490),        -- 管辖空间范围，NULL=全域权限
    data_level       SMALLINT DEFAULT 1              -- 1:L1公开 2:L2内部 3:L3涉密
                     CHECK (data_level BETWEEN 1 AND 3),
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_spatial_boundary ON users USING GIST(spatial_boundary)
    WHERE spatial_boundary IS NOT NULL;

-- 角色表
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    -- 预置角色: admin/forest_manager/patrol_officer/analyst/viewer
    description TEXT,
    is_temp     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 用户角色关联
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE permissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL  -- 'menu'/'api'/'data'
                  CHECK (resource_type IN ('menu','api','data')),
    resource_key  VARCHAR(100) NOT NULL, -- 菜单ID / API路由 / 数据类型
    action        VARCHAR(20) NOT NULL   -- 'read'/'write'/'delete'/'export'
                  CHECK (action IN ('read','write','delete','export'))
);
CREATE INDEX idx_permissions_role_id ON permissions(role_id);
```

### 3.3 林业空间核心表

```sql
-- 林场表
CREATE TABLE forest_farms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50) UNIQUE,
    admin_code  VARCHAR(20) NOT NULL,   -- 行政区划代码
    geom        GEOMETRY(Polygon, 4490) NOT NULL,
    area_ha     FLOAT,
    manager_id  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_forest_farms_geom ON forest_farms USING GIST(geom);
CREATE INDEX idx_forest_farms_admin_code ON forest_farms(admin_code);

-- 林业小班表
CREATE TABLE forest_plots (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_code      VARCHAR(50) UNIQUE NOT NULL,  -- 小班编码
    geom           GEOMETRY(Polygon, 4490) NOT NULL,
    area_ha        FLOAT NOT NULL,
    tree_species   VARCHAR(100),                 -- 主要树种
    age_class      VARCHAR(20),                  -- 龄组
    canopy_density FLOAT,                        -- 郁闭度
    admin_code     VARCHAR(20) NOT NULL,
    forest_farm_id UUID REFERENCES forest_farms(id),
    risk_level     SMALLINT DEFAULT 0            -- 0:无 1:低 2:中 3:高 4:极高
                   CHECK (risk_level BETWEEN 0 AND 4),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_forest_plots_geom ON forest_plots USING GIST(geom);
CREATE INDEX idx_forest_plots_farm ON forest_plots(forest_farm_id);
CREATE INDEX idx_forest_plots_risk ON forest_plots(risk_level);

-- 疫木点位表（核心空间表）
CREATE TABLE disease_trees (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geom           GEOMETRY(Point, 4490) NOT NULL,  -- CGCS2000 点位
    confidence     FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    class_label    VARCHAR(50) NOT NULL              -- 'dead_tree'/'discolored'/'suspected'
                   CHECK (class_label IN ('dead_tree','discolored','suspected')),
    severity       SMALLINT DEFAULT 1               -- 1:轻 2:中 3:重
                   CHECK (severity BETWEEN 1 AND 3),
    image_id       UUID REFERENCES remote_sensing_images(id),
    detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by    UUID REFERENCES users(id),
    verified_at    TIMESTAMPTZ,
    status         VARCHAR(20) DEFAULT 'pending'    -- pending/confirmed/false_positive/cleared
                   CHECK (status IN ('pending','confirmed','false_positive','cleared')),
    forest_plot_id UUID REFERENCES forest_plots(id),
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_disease_trees_geom ON disease_trees USING GIST(geom);
CREATE INDEX idx_disease_trees_detected_at ON disease_trees(detected_at DESC);
CREATE INDEX idx_disease_trees_status ON disease_trees(status);
CREATE INDEX idx_disease_trees_plot ON disease_trees(forest_plot_id);

-- 预警区域表
CREATE TABLE alert_zones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100),
    geom           GEOMETRY(Polygon, 4490) NOT NULL,
    level          VARCHAR(10) NOT NULL DEFAULT 'green'
                   CHECK (level IN ('green','yellow','orange','red')),
    disease_count  INTEGER DEFAULT 0,
    affected_area  FLOAT DEFAULT 0,               -- 公顷
    triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ,
    status         VARCHAR(20) DEFAULT 'active'
                   CHECK (status IN ('active','resolved','archived')),
    forest_farm_id UUID REFERENCES forest_farms(id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alert_zones_geom ON alert_zones USING GIST(geom);
CREATE INDEX idx_alert_zones_level ON alert_zones(level);
CREATE INDEX idx_alert_zones_status ON alert_zones(status);
```

### 3.4 遥感影像元数据表

```sql
CREATE TABLE remote_sensing_images (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename     VARCHAR(255) NOT NULL,
    minio_path   VARCHAR(500) NOT NULL,           -- MinIO 对象路径
    source_type  VARCHAR(50)                      -- 'satellite_gf2'/'satellite_gf7'/'sentinel2'/'uav_dom'
                 CHECK (source_type IN ('satellite_gf2','satellite_gf7','sentinel2','uav_dom','other')),
    resolution_m FLOAT,                           -- 空间分辨率（米）
    cloud_cover  FLOAT,                           -- 云覆盖率 0-1
    captured_at  TIMESTAMPTZ,
    bbox         GEOMETRY(Polygon, 4490),         -- 影像覆盖范围
    crs_epsg     INTEGER DEFAULT 4490,
    -- 植被指数预留字段（Task 5.7 实现后填充）
    ndvi_path    VARCHAR(500),                    -- NDVI GeoTIFF MinIO路径
    lai_path     VARCHAR(500),                    -- LAI GeoTIFF MinIO路径
    sr_path      VARCHAR(500),                    -- SR GeoTIFF MinIO路径
    status       VARCHAR(20) DEFAULT 'uploaded'   -- uploaded/preprocessing/ready/inferred/failed
                 CHECK (status IN ('uploaded','preprocessing','ready','inferred','failed')),
    uploaded_by  UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rsi_bbox ON remote_sensing_images USING GIST(bbox);
CREATE INDEX idx_rsi_captured_at ON remote_sensing_images(captured_at DESC);
CREATE INDEX idx_rsi_status ON remote_sensing_images(status);
```

### 3.5 巡查与工单表

```sql
-- 工单表
CREATE TABLE work_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(50) NOT NULL              -- 'patrol'/'treatment'/'verification'/'maintenance'
                  CHECK (type IN ('patrol','treatment','verification','maintenance')),
    status        VARCHAR(20) DEFAULT 'pending'     -- pending/assigned/in_progress/completed/cancelled
                  CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
    priority      SMALLINT DEFAULT 2               -- 1:低 2:中 3:高 4:紧急
                  CHECK (priority BETWEEN 1 AND 4),
    title         VARCHAR(200),
    description   TEXT,
    assignee_id   UUID REFERENCES users(id),
    created_by    UUID REFERENCES users(id),
    alert_zone_id UUID REFERENCES alert_zones(id),
    target_geom   GEOMETRY(Point, 4490),            -- 任务目标点位
    deadline      TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    evidence_urls JSONB DEFAULT '[]',               -- 现场证据 MinIO 路径数组
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_work_orders_assignee ON work_orders(assignee_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_target_geom ON work_orders USING GIST(target_geom)
    WHERE target_geom IS NOT NULL;

-- 巡查轨迹表
CREATE TABLE patrol_tracks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    workorder_id UUID REFERENCES work_orders(id),
    track        GEOMETRY(LineString, 4490),        -- Douglas-Peucker 压缩后轨迹
    raw_points   JSONB,                             -- 原始 GPS 点位数组 [{lng,lat,ts}]
    started_at   TIMESTAMPTZ NOT NULL,
    ended_at     TIMESTAMPTZ,
    distance_km  FLOAT,
    point_count  INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_patrol_tracks_geom ON patrol_tracks USING GIST(track)
    WHERE track IS NOT NULL;
CREATE INDEX idx_patrol_tracks_user ON patrol_tracks(user_id);
CREATE INDEX idx_patrol_tracks_started_at ON patrol_tracks(started_at DESC);
```

### 3.6 IoT 设备表

```sql
CREATE TABLE iot_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code     VARCHAR(100) UNIQUE NOT NULL,
    device_type     VARCHAR(50)                     -- 'trap'/'weather'/'soil'
                    CHECK (device_type IN ('trap','weather','soil','camera')),
    name            VARCHAR(100),
    geom            GEOMETRY(Point, 4490),
    status          VARCHAR(20) DEFAULT 'online'    -- online/offline/fault/maintenance
                    CHECK (status IN ('online','offline','fault','maintenance')),
    battery_pct     FLOAT CHECK (battery_pct BETWEEN 0 AND 100),
    signal_strength FLOAT,                          -- 4G 信号强度 dBm
    firmware_ver    VARCHAR(50),
    last_heartbeat  TIMESTAMPTZ,
    forest_farm_id  UUID REFERENCES forest_farms(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_iot_devices_geom ON iot_devices USING GIST(geom)
    WHERE geom IS NOT NULL;
CREATE INDEX idx_iot_devices_status ON iot_devices(status);
```

### 3.7 审计日志表

```sql
CREATE TABLE audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,               -- 操作类型
    resource   VARCHAR(100),                        -- 操作资源
    ip_address INET,
    user_agent TEXT,
    payload    JSONB,                               -- 操作详情
    hash       VARCHAR(64),                         -- 当前记录 SHA-256
    prev_hash  VARCHAR(64),                         -- 上一条记录 SHA-256（链式防篡改）
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 4. 空间索引策略

| 表 | 索引类型 | 字段 | 说明 |
|----|---------|------|------|
| disease_trees | GIST | geom | 疫木点位空间查询 |
| forest_plots | GIST | geom | 小班边界空间查询 |
| forest_farms | GIST | geom | 林场边界空间查询 |
| alert_zones | GIST | geom | 预警区域空间查询 |
| patrol_tracks | GIST | track | 轨迹空间查询 |
| remote_sensing_images | GIST | bbox | 影像覆盖范围查询 |
| users | GIST | spatial_boundary | 用户管辖范围查询 |
| iot_devices | GIST | geom | 设备位置查询 |
| work_orders | GIST | target_geom | 工单目标位置查询 |

**常用空间查询模式**：
```sql
-- 查询某区域内的疫木（空间权限过滤）
SELECT * FROM disease_trees
WHERE ST_Contains(
    ST_GeomFromGeoJSON($user_boundary),
    geom
) AND status != 'false_positive';

-- 统计预警区域内疫木数量
SELECT COUNT(*), SUM(ST_Area(geom::geography)/10000) as area_ha
FROM disease_trees
WHERE ST_Intersects(geom, (SELECT geom FROM alert_zones WHERE id=$zone_id));

-- 就近查找护林员（KNN）
SELECT id, username, ST_Distance(spatial_boundary::geography, ST_MakePoint($lng,$lat)::geography) as dist
FROM users
WHERE 'patrol_officer' = ANY(
    SELECT r.name FROM roles r JOIN user_roles ur ON r.id=ur.role_id WHERE ur.user_id=users.id
)
ORDER BY dist LIMIT 3;
```

---

## 5. MinIO 对象存储目录规范

```
pine-wilt-system/                    # 主 Bucket
├── raw-images/                      # 原始遥感影像
│   └── {year}/{month}/{image_id}.tif
├── processed-images/                # 预处理后影像
│   └── {year}/{month}/{image_id}_processed.tif
├── vegetation-index/                # 植被指数栅格
│   ├── ndvi/{image_id}_ndvi.tif
│   ├── lai/{image_id}_lai.tif
│   └── sr/{image_id}_sr.tif
├── patrol-evidence/                 # 巡查现场证据
│   └── {workorder_id}/{timestamp}_{filename}
├── reports/                         # 生成的报告文件
│   └── {year}/{report_id}.pdf
└── ai-models/                       # AI 模型文件（备份）
    └── yolov8_pine_best.onnx
```

---

## 6. 数据分层存储策略

| 数据类型 | 存储位置 | 保留策略 | 说明 |
|---------|---------|---------|------|
| 活跃业务数据 | PostgreSQL 主库 | 永久 | 用户、工单、疫木点位 |
| 遥感影像原始文件 | MinIO 标准存储 | 2年 | 超期后迁移至低频存储 |
| 植被指数栅格 | MinIO 标准存储 | 1年 | 可重新计算，超期归档 |
| IoT 时序数据 | InfluxDB | 1年 | 超期自动降采样 |
| 审计日志 | PostgreSQL audit_logs | 5年 | 合规要求 |
| Redis 缓存 | Redis | TTL自动过期 | accessToken 15min, refreshToken 7天 |

---

## 7. 初始数据

```sql
-- 插入预置角色
INSERT INTO roles (name, description) VALUES
('admin',           '系统管理员，全域权限'),
('forest_manager',  '林场管理员，管辖林场权限'),
('patrol_officer',  '护林员，巡查任务执行'),
('analyst',         '遥感数据分析师，影像处理与标注'),
('viewer',          '只读用户，查看公开数据');

-- 插入默认管理员（密码: Admin@2024，bcrypt hash）
INSERT INTO users (username, password_hash, real_name, status, data_level)
VALUES ('admin', '$2b$12$placeholder_hash_replace_on_first_run', '系统管理员', 'active', 3);
```
