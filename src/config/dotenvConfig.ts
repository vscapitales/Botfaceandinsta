import dotenv from 'dotenv';

dotenv.config();

export const config = {
  debug: process.env.DEBUG === 'true',
  pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  verifyToken: process.env.FACEBOOK_VERIFY_TOKEN || '',
  port: process.env.PORT || 3000,
};