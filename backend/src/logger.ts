import pino, { Logger as PinoLogger } from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const level = process.env.LOG_LEVEL || 'info';
const pretty = (process.env.LOG_PRETTY || '').toLowerCase() === 'true';

// Create base logger and coerce to a stable Logger type to avoid generic mismatch across pino versions
const baseLogger = pino({
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
}) as unknown as PinoLogger;

export const logger: PinoLogger = baseLogger;

export const httpLogger = pinoHttp({
  // Cast to any to satisfy pino-http <9 type expectations across pino@9
  logger: baseLogger as any,
  autoLogging: true,
  genReqId: (req) => {
    const hdr = req.headers['x-request-id'];
    if (typeof hdr === 'string' && hdr.length > 0) return hdr;
    return randomUUID();
  },
  customLogLevel: function (res: any, err: any) {
    const code = res?.statusCode ?? 0;
    if (err || code >= 500) return 'error';
    if (code >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        ip: (req.headers?.['x-forwarded-for'] as string) || req.socket?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      };
    },
    res(res: any) {
      return { statusCode: res?.statusCode ?? 0 };
    },
    err(err: any) {
      return { type: err?.type, message: err?.message, stack: err?.stack };
    }
  }
});
