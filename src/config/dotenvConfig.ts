// dotenvConfig.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  debug: process.env.DEBUG === 'true',
  facebookPageAccessToken: process.env.FACEBOOK_API_TOKEN || '', // Token para Messenger
  instagramAccessToken: process.env.INSTAGRAM_API_TOKEN || '', // Token para Instagram
  verifyToken: process.env.FACEBOOK_VERIFY_TOKEN || '', // Token de verificación para Webhooks
  openaiApiKey: process.env.OPENAI_API_KEY || '', // API Key de OpenAI
  port: parseInt(process.env.PORT || '3000', 10), // Puerto de la aplicación
};
