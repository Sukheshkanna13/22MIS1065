import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  evalBaseUrl: process.env.EVAL_BASE_URL || 'http://4.224.186.213',
  bearerToken: process.env.BEARER_TOKEN || '',
  logEmail: process.env.LOG_EMAIL || '',
  logName: process.env.LOG_NAME || '',
  logRollNo: process.env.LOG_ROLL_NO || '',
  logAccessCode: process.env.LOG_ACCESS_CODE || '',
  logClientId: process.env.LOG_CLIENT_ID || '',
  logClientSecret: process.env.LOG_CLIENT_SECRET || '',
};
