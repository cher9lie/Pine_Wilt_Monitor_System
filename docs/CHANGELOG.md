# 变更日志 (CHANGELOG)

## [1.1.0] - 2025-01-20

### 新增功能
- **登录页重设计**：企业级视频背景登录页（白色顶栏+循环MP4+白色登录卡片+深灰底栏）
- **业务管理模块**（3页完整交互）
  - 巡查任务分配：预警驱动的任务派发，支持优先级/目标区域/指派人
  - 灾情上报：现场证据表单+多级审批状态流转+照片上传
  - 资源调度：人员/物资/设备三合一台账管理
- **巡护规划页**：网格化风险评分+巡护频次自动计算+打卡点管理
- **病死木标绘页**：标绘工具面板+病害属性编辑+标注统计+样本导出
- **数据质量控制页**：坐标一致性/字段完整率/拓扑正确率检查+SRID校验表
- **地图集制作页**：4种业务模板选择+已生成图集管理
- **系统设置页**：预警阈值配置+AI推理参数+系统信息+数据库运维操作

### 修复
- 全局 Element Plus 深色主题覆盖（表格斑马纹/标签/对话框/分页器等）
- 登录后菜单不显示问题（allowedMenus 加载时机修复）
- MapLibre GL JS 导入方式修复（`import *` 替代默认导入）
- Vite `@/` 路径别名缓存问题
- PostgreSQL init.sql 中 bcrypt 密码哈希修正

### 文档
- `docs/CODEBASE.md`：完整代码库维护指南（供AI智能体维护使用）
- `docs/CHANGELOG.md`：本文件

---

## [1.0.0] - 2025-01-20

### 初始发布
- **前端**：Vue 3 + TypeScript + MapLibre GL JS + ECharts + Element Plus
  - 26 个页面，9 大功能模块
  - 动态 RBAC 权限菜单（5层15角色）
  - 深色科技感大屏主题
  - JWT 认证闭环（路由守卫+静默刷新+Axios拦截器）
  - Esri World Imagery 卫星底图 + 病死木红色发光图层

- **后端**：Node.js + Express + TypeScript
  - 6 个路由模块（auth/rbac/ingest/alert/patrol/data）
  - JWT + RBAC + 空间权限三层中间件
  - PostgreSQL 统一数据库（11表+GIST空间索引）
  - Redis 优雅降级（内存 fallback）
  - 全局异常处理 + 链路追踪

- **AI 推理**：Python FastAPI + ONNX Runtime
  - YOLOv8 ONNX CPU 推理（ARM64 兼容）
  - GeoTIFF 瓦片化推理 + NMS 去重
  - 像素→地理坐标转换（CGCS2000）
  - 植被指数接口（NDVI/LAI/SR）

- **基础设施**
  - Docker Compose（PostgreSQL+PostGIS, Redis, MinIO, InfluxDB, EMQX）
  - ARM64 部署规划文档
  - 5 个示例账号（覆盖5个权限层级）
