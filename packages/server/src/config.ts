import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '.env'),
});

const defaultPort = 7171;

const port = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;

export const config = {
  port,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${port}`,
  postgresUrl: process.env.POSTGRES_URL as string,
  adminToken: process.env.ADMIN_TOKEN as string,
  jwtSecret: process.env.JWT_SECRET as string,
  gotenbergUrl: process.env.GOTENBERG_URL || 'http://localhost:3030',
  dataPath: process.env.DATA_PATH || path.join(__dirname, '..', 'data'),
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '25'),
    from: process.env.MAIL_FROM,
    secure: process.env.MAIL_SECURE === 'true',
    requireTLS: process.env.MAIL_REQUIRE_TLS === 'true',
    username: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
  },
};

export type Config = typeof config;

export function checkConfig(): void {
  const _config = config as Partial<typeof config>;

  if (!_config.publicUrl) {
    throw new Error('Please configure PUBLIC_URL');
  }

  if (!_config.postgresUrl) {
    throw new Error('Please configure POSTGRES_URL');
  }

  if (!_config.adminToken) {
    throw new Error('Please configure ADMIN_TOKEN');
  }
}
