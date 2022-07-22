import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mollieApiKey: process.env.MOLLIE_API_KEY || '',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
};
