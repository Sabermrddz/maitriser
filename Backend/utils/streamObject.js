import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getBucket, getPresignedExpiry } from '../config/r2.js';

// Streams a stored object through the backend so clients can authenticate
// with the Authorization header (no cookie, no CORS, no redirect expiry).
export async function streamStorageObject(res, key, fallbackContentType) {
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
    expiresIn: getPresignedExpiry(),
  });
  let upstream;
  try {
    upstream = await fetch(url);
  } catch {
    return res.status(502).json({ message: 'File not found' });
  }
  if (!upstream.ok) {
    return res.status(upstream.status === 404 ? 404 : 502).json({ message: 'File not found' });
  }
  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.setHeader('Content-Type', upstream.headers.get('content-type') || fallbackContentType || 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(buffer);
}
