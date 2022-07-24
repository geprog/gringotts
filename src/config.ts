import dotenv from 'dotenv';

dotenv.config();

const defaultPort = 3000;

export const config = {
  port: defaultPort,
  mollieApiKey: process.env.MOLLIE_API_KEY || '',
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${defaultPort}`,
  webhookUrl: '/payment/webhook',
};
