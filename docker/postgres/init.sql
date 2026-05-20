-- ============================================================
-- 「松海护航」松材线虫监测预警平台 — PostgreSQL + PostGIS 初始化脚本
-- 坐标系：CGCS2000 EPSG:4490（统一标准）
-- ============================================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. 用户与权限体系
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(50) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    email            VARCHAR(100),
    phone            VARCHAR(20),
    real_name        VARCHAR(50),
    department       VARCHAR(100),
    status           VARCHAR(20) DEFAULT 'active'
                     CHECK (status IN ('active','frozen','archived')),
    spatial_boundary GEOMETRY(Polygon, 4490),
    data_level       SMALLINT DEFAULT 1
                     CHECK (data_level BETWEEN 1 AND 3),
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_spatial_boundary ON users USING GIST(spatial_boundary)
    WHERE spatial_boundary IS NOT NULL;

CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_temp     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL
                  CHECK (resource_type IN ('menu','api','data')),
    resource_key  VARCHAR(100) NOT NULL,
    action        VARCHAR(20) NOT NULL
                  CHECK (action IN ('read','write','delete','export'))
);

CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON permissions(role_id);

-- ============================================================
-- 2. 林业空间核心表
-- ============================================================

CREATE TABLE IF NOT EXISTS forest_farms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50) UNIQUE,
    admin_code  VARCHAR(20) NOT NULL,
    geom        GEOMETRY(Polygon, 4490) NOT NULL,
    area_ha     FLOAT,
    manager_id  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forest_farms_geom ON forest_farms USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_forest_farms_admin_code ON forest_farms(admin_code);

CREATE TABLE IF NOT EXISTS forest_plots (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_code      VARCHAR(50) UNIQUE NOT NULL,
    geom           GEOMETRY(Polygon, 4490) NOT NULL,
    area_ha        FLOAT NOT NULL,
    tree_species   VARCHAR(100),
    age_class      VARCHAR(20),
    canopy_density FLOAT,
    admin_code     VARCHAR(20) NOT NULL,
    forest_farm_id UUID REFERENCES forest_farms(id),
    risk_level     SMALLINT DEFAULT 0
                   CHECK (risk_level BETWEEN 0 AND 4),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forest_plots_geom ON forest_plots USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_forest_plots_farm ON forest_plots(forest_farm_id);
CREATE INDEX IF NOT EXISTS idx_forest_plots_risk ON forest_plots(risk_level);

-- ============================================================
-- 3. 遥感影像元数据表
-- ============================================================

CREATE TABLE IF NOT EXISTS remote_sensing_images (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename     VARCHAR(255) NOT NULL,
    minio_path   VARCHAR(500) NOT NULL,
    source_type  VARCHAR(50)
                 CHECK (source_type IN ('satellite_gf2','satellite_gf7','sentinel2','uav_dom','other')),
    resolution_m FLOAT,
    cloud_cover  FLOAT,
    captured_at  TIMESTAMPTZ,
    bbox         GEOMETRY(Polygon, 4490),
    crs_epsg     INTEGER DEFAULT 4490,
    ndvi_path    VARCHAR(500),
    lai_path     VARCHAR(500),
    sr_path      VARCHAR(500),
    status       VARCHAR(20) DEFAULT 'uploaded'
                 CHECK (status IN ('uploaded','preprocessing','ready','inferred','failed')),
    uploaded_by  UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsi_bbox ON remote_sensing_images USING GIST(bbox)
    WHERE bbox IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rsi_captured_at ON remote_sensing_images(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsi_status ON remote_sensing_images(status);

-- ============================================================
-- 4. 疫木点位表（核心空间表）
-- ============================================================

CREATE TABLE IF NOT EXISTS disease_trees (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geom           GEOMETRY(Point, 4490) NOT NULL,
    confidence     FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    class_label    VARCHAR(50) NOT NULL
                   CHECK (class_label IN ('dead_tree','discolored','suspected')),
    severity       SMALLINT DEFAULT 1
                   CHECK (severity BETWEEN 1 AND 3),
    image_id       UUID REFERENCES remote_sensing_images(id),
    detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by    UUID REFERENCES users(id),
    verified_at    TIMESTAMPTZ,
    status         VARCHAR(20) DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','false_positive','cleared')),
    forest_plot_id UUID REFERENCES forest_plots(id),
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_trees_geom ON disease_trees USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_disease_trees_detected_at ON disease_trees(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_trees_status ON disease_trees(status);
CREATE INDEX IF NOT EXISTS idx_disease_trees_plot ON disease_trees(forest_plot_id);
CREATE INDEX IF NOT EXISTS idx_disease_trees_image ON disease_trees(image_id);

-- ============================================================
-- 5. 预警区域表
-- ============================================================

CREATE TABLE IF NOT EXISTS alert_zones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100),
    geom           GEOMETRY(Polygon, 4490) NOT NULL,
    level          VARCHAR(10) NOT NULL DEFAULT 'green'
                   CHECK (level IN ('green','yellow','orange','red')),
    disease_count  INTEGER DEFAULT 0,
    affected_area  FLOAT DEFAULT 0,
    triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ,
    status         VARCHAR(20) DEFAULT 'active'
                   CHECK (status IN ('active','resolved','archived')),
    forest_farm_id UUID REFERENCES forest_farms(id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_zones_geom ON alert_zones USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_alert_zones_level ON alert_zones(level);
CREATE INDEX IF NOT EXISTS idx_alert_zones_status ON alert_zones(status);

-- ============================================================
-- 6. 工单与巡查轨迹表
-- ============================================================

CREATE TABLE IF NOT EXISTS work_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(50) NOT NULL
                  CHECK (type IN ('patrol','treatment','verification','maintenance')),
    status        VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
    priority      SMALLINT DEFAULT 2
                  CHECK (priority BETWEEN 1 AND 4),
    title         VARCHAR(200),
    description   TEXT,
    assignee_id   UUID REFERENCES users(id),
    created_by    UUID REFERENCES users(id),
    alert_zone_id UUID REFERENCES alert_zones(id),
    target_geom   GEOMETRY(Point, 4490),
    deadline      TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    evidence_urls JSONB DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_target_geom ON work_orders USING GIST(target_geom)
    WHERE target_geom IS NOT NULL;

CREATE TABLE IF NOT EXISTS patrol_tracks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    workorder_id UUID REFERENCES work_orders(id),
    track        GEOMETRY(LineString, 4490),
    raw_points   JSONB,
    started_at   TIMESTAMPTZ NOT NULL,
    ended_at     TIMESTAMPTZ,
    distance_km  FLOAT,
    point_count  INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrol_tracks_geom ON patrol_tracks USING GIST(track)
    WHERE track IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patrol_tracks_user ON patrol_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_patrol_tracks_started_at ON patrol_tracks(started_at DESC);

-- ============================================================
-- 7. IoT 设备表
-- ============================================================

CREATE TABLE IF NOT EXISTS iot_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code     VARCHAR(100) UNIQUE NOT NULL,
    device_type     VARCHAR(50)
                    CHECK (device_type IN ('trap','weather','soil','camera')),
    name            VARCHAR(100),
    geom            GEOMETRY(Point, 4490),
    status          VARCHAR(20) DEFAULT 'online'
                    CHECK (status IN ('online','offline','fault','maintenance')),
    battery_pct     FLOAT CHECK (battery_pct BETWEEN 0 AND 100),
    signal_strength FLOAT,
    firmware_ver    VARCHAR(50),
    last_heartbeat  TIMESTAMPTZ,
    forest_farm_id  UUID REFERENCES forest_farms(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_geom ON iot_devices USING GIST(geom)
    WHERE geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iot_devices_status ON iot_devices(status);

-- ============================================================
-- 8. 审计日志表
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    resource   VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    payload    JSONB,
    hash       VARCHAR(64),
    prev_hash  VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- 9. 初始数据：角色 + 权限矩阵 + 示例账号
-- ============================================================

-- 9.1 角色体系（5 个权限层级）
INSERT INTO roles (name, description) VALUES
    -- 基础设施管控层
    ('admin',             'System Administrator - Full access'),
    ('db_admin',          'Database Administrator'),
    ('auditor',           'System Auditor'),
    -- 基层技术操作层
    ('rs_engineer',       'Remote Sensing Engineer'),
    ('uav_operator',      'UAV Operator'),
    ('patrol_officer',    'Patrol Officer / Forest Ranger'),
    -- 中层业务管理层
    ('forest_manager',    'Forest Farm Manager'),
    ('user_admin',        'User Permission Administrator'),
    ('finance_admin',     'Finance Administrator'),
    ('trainer',           'Training Administrator'),
    -- 高层决策分析层
    ('bureau_leader',     'Forestry Bureau Leader'),
    ('forestry_station',  'Forest Protection Station Staff'),
    ('insurance_company', 'Insurance Company Representative'),
    -- 外部信息访问层
    ('researcher',        'University / Research Personnel'),
    ('viewer',            'Public Read-only Viewer')
ON CONFLICT (name) DO NOTHING;

-- 9.2 菜单权限矩阵
-- resource_type='menu', resource_key=路由路径, action='read'/'write'
-- admin 拥有所有权限，不单独列举

-- 遥感工程师 (rs_engineer)：监测预警、数据管理
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/monitoring/upload', '/monitoring/alerts', '/monitoring/annotation', '/monitoring/assessment',
  '/data/images', '/data/ground', '/data/quality',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'rs_engineer'
ON CONFLICT DO NOTHING;

-- 护林员 (patrol_officer)：巡护巡查、灾情上报
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/patrol/plan', '/patrol/tracks', '/patrol/workorders',
  '/biz/report-disaster',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'patrol_officer'
ON CONFLICT DO NOTHING;

-- 林场管理员 (forest_manager)：业务管理、巡护、财务、出图
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/monitoring/alerts', '/monitoring/assessment',
  '/biz/tasks', '/biz/report-disaster', '/biz/resources',
  '/patrol/plan', '/patrol/tracks', '/patrol/workorders',
  '/finance/purchase', '/finance/budget',
  '/report/datasets', '/report/periodic',
  '/data/images', '/data/ground',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'forest_manager'
ON CONFLICT DO NOTHING;

-- 林业局领导 (bureau_leader)：态势大屏、报告、只读统计
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/monitoring/alerts', '/monitoring/assessment',
  '/report/datasets', '/report/atlas', '/report/periodic',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'bureau_leader'
ON CONFLICT DO NOTHING;

-- 科研人员 (researcher)：仅看脱敏数据、数据申请
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/data/images',
  '/report/datasets',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'researcher'
ON CONFLICT DO NOTHING;

-- 财务管理员 (finance_admin)
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/finance/purchase', '/finance/budget', '/finance/audit',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'finance_admin'
ON CONFLICT DO NOTHING;

-- 用户管理员 (user_admin)
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/system/users', '/system/roles', '/system/logs', '/system/settings',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'user_admin'
ON CONFLICT DO NOTHING;

-- 审计员 (auditor)
INSERT INTO permissions (role_id, resource_type, resource_key, action)
SELECT r.id, 'menu', unnest(ARRAY[
  '/dashboard',
  '/system/logs',
  '/finance/audit',
  '/profile'
]), 'read'
FROM roles r WHERE r.name = 'auditor'
ON CONFLICT DO NOTHING;

-- 9.3 示例账号（密码均为 bcrypt hash）
-- admin / Admin@2024
INSERT INTO users (username, password_hash, real_name, status, data_level, department)
VALUES ('admin', '$2b$12$FLb4f.n0HyKvWTkqNKjjjeXrqjrhNmliRCeZ7aWN.KsGMZzGhfli6', 'System Admin', 'active', 3, 'IT Department')
ON CONFLICT (username) DO NOTHING;

-- engineer / Test@2024
INSERT INTO users (username, password_hash, real_name, status, data_level, department)
VALUES ('engineer', '$2b$12$BLsf59BjS9.i7.EO8l6uM./1f5LMFRn/jLjsj9IgQrg1Vci9hwev6', 'RS Engineer Demo', 'active', 2, 'Remote Sensing Dept')
ON CONFLICT (username) DO NOTHING;

-- manager / Test@2024
INSERT INTO users (username, password_hash, real_name, status, data_level, department)
VALUES ('manager', '$2b$12$BLsf59BjS9.i7.EO8l6uM./1f5LMFRn/jLjsj9IgQrg1Vci9hwev6', 'Forest Manager Demo', 'active', 2, 'Red Star Forest Farm')
ON CONFLICT (username) DO NOTHING;

-- leader / Test@2024
INSERT INTO users (username, password_hash, real_name, status, data_level, department)
VALUES ('leader', '$2b$12$BLsf59BjS9.i7.EO8l6uM./1f5LMFRn/jLjsj9IgQrg1Vci9hwev6', 'Bureau Leader Demo', 'active', 2, 'Forestry Bureau')
ON CONFLICT (username) DO NOTHING;

-- researcher / Test@2024
INSERT INTO users (username, password_hash, real_name, status, data_level, department)
VALUES ('researcher', '$2b$12$BLsf59BjS9.i7.EO8l6uM./1f5LMFRn/jLjsj9IgQrg1Vci9hwev6', 'Researcher Demo', 'active', 1, 'University')
ON CONFLICT (username) DO NOTHING;

-- 9.4 为示例账号分配角色
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'engineer' AND r.name = 'rs_engineer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'manager' AND r.name = 'forest_manager'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'leader' AND r.name = 'bureau_leader'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'researcher' AND r.name = 'researcher'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
SELECT 'Pine Wilt Monitor System database initialized successfully.' AS status;
