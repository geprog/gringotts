import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '.env'),
});

const defaultPort = 3000;

export const config = {
  port: defaultPort,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${defaultPort}`,
  postgresUrl: process.env.POSTGRES_URL as string,
  adminToken: process.env.ADMIN_TOKEN as string,
};

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
