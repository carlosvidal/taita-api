import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let client = null;

const getClient = () => {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
};

/**
 * Upload a buffer to R2
 * @param {Buffer} buffer - File buffer
 * @param {string} key - Object key (e.g. "1/original/image.webp")
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL
 */
export const uploadBuffer = async (buffer, key, contentType = 'image/webp') => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await getClient().send(command);
  return `${process.env.R2_PUBLIC_URL}/${key}`;
};

/**
 * Delete an object from R2
 * @param {string} key - Object key
 */
export const deleteObject = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });
  await getClient().send(command);
};

/**
 * Check if R2 is properly configured
 * @returns {boolean}
 */
export const isConfigured = () => {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
};

export default { uploadBuffer, deleteObject, isConfigured };
