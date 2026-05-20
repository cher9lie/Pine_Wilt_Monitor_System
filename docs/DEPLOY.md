# ARM64 容器化部署规划

> 目标架构：ARM64 (aarch64) 纯 CPU，无 GPU
> 容器运行时：Docker 24+ / Docker Compose v2

---

## 1. ARM64 镜像选型清单

| 服务 | 镜像 | ARM64 状态 | 说明 |
|------|------|-----------|------|
| PostgreSQL+PostGIS | `postgis/postgis:15-3.4` | ✅ 官方支持 | 多架构镜像 |
| Redis | `redis:7-alpine` | ✅ 官方支持 | 多架构镜像 |
| MinIO | `minio/minio:latest` | ✅ 官方支持 | 多架构镜像 |
| InfluxDB | `influxdb:2.7-alpine` | ✅ 官方支持 | 多架构镜像 |
| EMQX | `emqx/emqx:5.3.0` | ✅ 官方支持 | 多架构镜像 |
| Nginx | `nginx:1.25-alpine` | ✅ 官方支持 | 多架构镜像 |
| Node.js Backend | 自建（`node:20-alpine`） | ✅ 官方支持 | 见 Dockerfile |
| Python AI Service | 自建（`python:3.11-slim`） | ✅ 官方支持 | 见 Dockerfile |

---

## 2. Node.js 后端 Dockerfile

```dockerfile
# docker/backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/app.js"]
```

---

## 3. Python AI 服务 Dockerfile

```dockerfile
# docker/ai_service/Dockerfile
FROM python:3.11-slim AS base
WORKDIR /app

# 安装 GDAL 系统依赖（Ubuntu ARM64 官方源支持）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY ai_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY ai_service/ .

# 创建模型目录（用户需手动上传 .onnx 文件）
RUN mkdir -p /app/models

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**ai_service/requirements.txt**：
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
onnxruntime==1.18.0          # CPU-only，ARM64 官方支持
rasterio==1.3.10
GDAL==3.6.4
psycopg2-binary==2.9.9
numpy==1.26.4
Pillow==10.3.0
python-multipart==0.0.9
httpx==0.27.0
pydantic==2.7.1
```

---

## 4. Nginx 配置

```nginx
# docker/nginx/nginx.conf
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    gzip          on;
    gzip_types    text/plain application/json application/javascript text/css;

    # 限流
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    upstream backend {
        server backend:3000;
        keepalive 32;
    }

    upstream ai_service {
        server ai_service:8000;
        keepalive 8;
    }

    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # 前端静态资源
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1d;
        }

        # 后端 API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Trace-ID $request_id;
        }

        # 认证接口（更严格限流）
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
        }

        # AI 推理服务（内部调用，不对外暴露）
        # location /ai/ { ... }
    }
}
```

---

## 5. docker-compose.yml（开发环境）

```yaml
# docker/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgis/postgis:15-3.4
    platform: linux/arm64
    container_name: pine_postgres
    environment:
      POSTGRES_DB: pine_wilt_db
      POSTGRES_USER: pine_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pine_user -d pine_wilt_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    platform: linux/arm64
    container_name: pine_redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    platform: linux/arm64
    container_name: pine_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  influxdb:
    image: influxdb:2.7-alpine
    platform: linux/arm64
    container_name: pine_influxdb
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: ${INFLUXDB_USER}
      DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUXDB_PASSWORD}
      DOCKER_INFLUXDB_INIT_ORG: pine-wilt
      DOCKER_INFLUXDB_INIT_BUCKET: iot-sensors
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUXDB_TOKEN}
    volumes:
      - influxdb_data:/var/lib/influxdb2
    ports:
      - "8086:8086"
    restart: unless-stopped

  emqx:
    image: emqx/emqx:5.3.0
    platform: linux/arm64
    container_name: pine_emqx
    environment:
      EMQX_NODE__NAME: emqx@pine_emqx
    volumes:
      - emqx_data:/opt/emqx/data
    ports:
      - "1883:1883"   # MQTT
      - "8083:8083"   # MQTT over WebSocket
      - "18083:18083" # Dashboard
    healthcheck:
      test: ["CMD", "/opt/emqx/bin/emqx", "ctl", "status"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
  influxdb_data:
  emqx_data:
```

---

## 6. docker-compose.prod.yml（生产环境）

```yaml
# docker/docker-compose.prod.yml
version: '3.9'

services:
  nginx:
    image: nginx:1.25-alpine
    platform: linux/arm64
    container_name: pine_nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - frontend_dist:/usr/share/nginx/html:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ..
      dockerfile: docker/backend/Dockerfile
      platforms:
        - linux/arm64
    container_name: pine_backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pine_user:${POSTGRES_PASSWORD}@postgres:5432/pine_wilt_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      AI_SERVICE_URL: http://ai_service:8000
      INFLUXDB_URL: http://influxdb:8086
      INFLUXDB_TOKEN: ${INFLUXDB_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
    restart: unless-stopped

  ai_service:
    build:
      context: ..
      dockerfile: docker/ai_service/Dockerfile
      platforms:
        - linux/arm64
    container_name: pine_ai_service
    environment:
      DATABASE_URL: postgresql://pine_user:${POSTGRES_PASSWORD}@postgres:5432/pine_wilt_db
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      MODEL_PATH: /app/models/yolov8_pine_best.onnx
    volumes:
      - ai_models:/app/models  # 挂载模型文件目录
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '4.0'   # ONNX CPU 推理需要较多 CPU
          memory: 2G
    restart: unless-stopped

  postgres:
    image: postgis/postgis:15-3.4
    platform: linux/arm64
    container_name: pine_postgres
    environment:
      POSTGRES_DB: pine_wilt_db
      POSTGRES_USER: pine_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pine_user -d pine_wilt_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    platform: linux/arm64
    container_name: pine_redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    platform: linux/arm64
    container_name: pine_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  influxdb:
    image: influxdb:2.7-alpine
    platform: linux/arm64
    container_name: pine_influxdb
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: ${INFLUXDB_USER}
      DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUXDB_PASSWORD}
      DOCKER_INFLUXDB_INIT_ORG: pine-wilt
      DOCKER_INFLUXDB_INIT_BUCKET: iot-sensors
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUXDB_TOKEN}
    volumes:
      - influxdb_data:/var/lib/influxdb2
    restart: unless-stopped

  emqx:
    image: emqx/emqx:5.3.0
    platform: linux/arm64
    container_name: pine_emqx
    volumes:
      - emqx_data:/opt/emqx/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
  influxdb_data:
  emqx_data:
  ai_models:      # 持久化模型文件，避免容器重建后丢失
  frontend_dist:
```

---

## 7. 环境变量模板

```bash
# .env.example（复制为 .env 并填写真实值）

# PostgreSQL
POSTGRES_PASSWORD=your_strong_password_here

# Redis
REDIS_PASSWORD=your_redis_password_here

# MinIO
MINIO_ROOT_USER=pine_admin
MINIO_ROOT_PASSWORD=your_minio_password_here

# JWT（使用 openssl rand -hex 64 生成）
JWT_SECRET=your_jwt_secret_64_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_64_chars_minimum

# InfluxDB
INFLUXDB_USER=pine_influx
INFLUXDB_PASSWORD=your_influxdb_password
INFLUXDB_TOKEN=your_influxdb_token

# AI 服务
MODEL_PATH=/app/models/yolov8_pine_best.onnx
```

---

## 8. 模型文件部署说明

```bash
# 1. 在本地（RTX 3060）训练完成后导出 ONNX 模型
#    yolo export model=best.pt format=onnx opset=12

# 2. 将模型文件上传到服务器
scp yolov8_pine_best.onnx user@server:/path/to/project/ai_service/models/

# 3. 若使用 Docker Volume，通过以下方式注入模型文件
docker cp yolov8_pine_best.onnx pine_ai_service:/app/models/yolov8_pine_best.onnx

# 4. 验证模型加载
curl http://localhost:8000/health
# 期望响应: {"status":"ok","model_loaded":true,"model_path":"..."}
```

---

## 9. 快速启动

```bash
# 1. 克隆项目并进入目录
cd Pine_Wilt_Monitor_System

# 2. 复制并填写环境变量
cp .env.example .env
# 编辑 .env 填写真实密码

# 3. 启动基础设施（开发环境）
cd docker
docker compose up -d

# 4. 等待 PostgreSQL 就绪后初始化数据库
docker compose exec postgres psql -U pine_user -d pine_wilt_db -f /docker-entrypoint-initdb.d/init.sql

# 5. 启动后端（开发模式）
cd ../backend
npm install
npm run dev

# 6. 启动 AI 服务（开发模式）
cd ../ai_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 7. 启动前端（开发模式）
cd ../frontend
npm install
npm run dev

# 8. 生产部署
cd docker
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 10. 数据持久化卷挂载规划

| 卷名 | 挂载路径 | 说明 | 备份优先级 |
|------|---------|------|-----------|
| `postgres_data` | `/var/lib/postgresql/data` | 核心业务数据 | 🔴 最高 |
| `minio_data` | `/data` | 遥感影像、附件 | 🔴 最高 |
| `ai_models` | `/app/models` | ONNX 模型文件 | 🟡 中 |
| `redis_data` | `/data` | 持久化缓存 | 🟢 低 |
| `influxdb_data` | `/var/lib/influxdb2` | IoT 时序数据 | 🟡 中 |
| `emqx_data` | `/opt/emqx/data` | MQTT 配置 | 🟢 低 |

**备份策略**：
```bash
# PostgreSQL 每日备份
docker exec pine_postgres pg_dump -U pine_user pine_wilt_db | gzip > backup_$(date +%Y%m%d).sql.gz

# MinIO 同步备份（使用 mc 客户端）
mc mirror pine/pine-wilt-system /backup/minio/
```
