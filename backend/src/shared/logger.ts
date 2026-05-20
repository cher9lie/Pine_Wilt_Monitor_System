import winston from 'winston'
import { config } from '../config/env'

const { combine, timestamp, json, colorize, simple } = winston.format

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json()
  ),
  defaultMeta: { service: 'pine-wilt-backend' },
  transports: [
    new winston.transports.Console({
      format: config.nodeEnv === 'development'
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
  ],
})
