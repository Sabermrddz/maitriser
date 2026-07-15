import { createClerkClient } from '@clerk/backend';

export function getClerkClient() {
  if (!process.env.CLERK_SECRET_KEY) return null;
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}
