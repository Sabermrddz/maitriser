import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger.js';

let r2Client = null;

const getR2Client = () => {
  if (r2Client) return r2Client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    logger.warn('R2 credentials not configured, file operations will fail');
    return null;
  }
  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return r2Client;
};

const getBucket = () => process.env.R2_BUCKET_NAME || 'quizapp-assets';

const getPresignedExpiry = () => parseInt(process.env.R2_PRESIGNED_EXPIRY || '3600', 10);

export { getR2Client, getBucket, getPresignedExpiry };
