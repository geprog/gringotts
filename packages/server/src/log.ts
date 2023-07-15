import pino from 'pino';

export const log =
  process.env.NODE_ENV === 'production'
    ? undefined
    : pino({
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        },
      });
