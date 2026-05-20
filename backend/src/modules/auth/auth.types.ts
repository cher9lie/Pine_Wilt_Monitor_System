export interface User {
  id: string
  username: string
  password_hash: string
  email: string | null
  phone: string | null
  real_name: string | null
  department: string | null
  status: 'active' | 'frozen' | 'archived'
  spatial_boundary: string | null  // GeoJSON Polygon WKT
  data_level: 1 | 2 | 3
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
  roles: string[]  // 角色名称数组（JOIN 查询结果）
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number  // 秒
}

export interface JwtPayload {
  userId: string
  username: string
  roles: string[]
  dataLevel: 1 | 2 | 3
  jti: string
  iat?: number
  exp?: number
}

// Express Request 扩展（注入认证信息）
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
      traceId?: string
      spatialFilter?: string  // 空间权限 SQL 片段
    }
  }
}
