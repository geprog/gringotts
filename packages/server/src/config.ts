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
  webhookUrl: '/payment/webhook',
  postgresUrl: process.env.POSTGRES_URL,
  jwtSecret: process.env.JWT_SECRET,
};
