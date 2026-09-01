import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger.js';

let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;
  const endpoint = process.env.B2_ENDPOINT;
  const accessKeyId = process.env.B2_KEY_ID;
  const secretAccessKey = process.env.B2_APP_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    logger.warn('B2 credentials not configured, file operations will fail');
    return null;
  }
  s3Client = new S3Client({
    region: process.env.B2_REGION || 'us-west-004',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3Client;
};

const getBucket = () => process.env.B2_BUCKET_NAME || 'quizapp-assets';

const getPresignedExpiry = () => parseInt(process.env.B2_PRESIGNED_EXPIRY || '3600', 10);

export { getS3Client as getR2Client, getBucket, getPresignedExpiry };
