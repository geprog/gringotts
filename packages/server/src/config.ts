import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '.env'),
});

const defaultPort = 3000;

export const config = {
  port: defaultPort,
  mollieApiKey: process.env.MOLLIE_API_KEY,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${defaultPort}`,
  postgresUrl: process.env.POSTGRES_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  webhookUrl: process.env.WEBHOOK_URL as string,
  paymentProvider: process.env.PAYMENT_PROVIDER,
};

export function checkConfig(): void {
  const _config = config as Partial<typeof config>;

  if (!_config.mollieApiKey) {
    throw new Error('Please configure MOLLIE_API_KEY');
  }

  if (!_config.publicUrl) {
    throw new Error('Please configure PUBLIC_URL');
  }

  if (!_config.postgresUrl) {
    throw new Error('Please configure POSTGRES_URL');
  }

  if (!_config.jwtSecret) {
    throw new Error('Please configure JWT_SECRET');
  }

  if (!_config.webhookUrl) {
    throw new Error('Please configure WEBHOOK_URL');
  }
}
