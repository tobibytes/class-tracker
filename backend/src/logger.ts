import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const level = process.env.LOG_LEVEL || 'info';
const pretty = (process.env.LOG_PRETTY || '').toLowerCase() === 'true';

export const logger = pino({
  level,
  base: { service: 'class-tracker-backend' },
  redact: {
    paths: [
      'req.headers.authorization',
      'headers.authorization',
      'req.body.access_token',
      'access_token',
      'CANVAS_ACCESS_TOKEN'
    ],
    censor: '***'
  },
  transport: pretty
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', singleLine: false }
      }
    : undefined
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId: (req) => {
    const hdr = req.headers['x-request-id'];
    if (typeof hdr === 'string' && hdr.length > 0) return hdr;
    return randomUUID();
  },
  customLogLevel: function (res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        id: (req as any).id,
        method: req.method,
        url: req.url,
        ip: (req.headers['x-forwarded-for'] as string) || (req.socket && req.socket.remoteAddress),
        userAgent: req.headers['user-agent']
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
    err(err) {
      return { type: (err as any).type, message: err.message, stack: err.stack };
    }
  }
});
