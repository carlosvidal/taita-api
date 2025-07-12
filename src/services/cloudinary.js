import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { Readable } from 'stream';

// Configure Cloudinary - ensure configuration happens at runtime
const configureCloudinary = () => {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    // Log configuration status for debugging
    console.log('Cloudinary configured with:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });
  }
};

/**
 * Upload image to Cloudinary with optimizations
 * @param {Buffer} fileBuffer - Image buffer
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder
 * @param {string} options.publicId - Custom public ID
 * @param {string} options.entityType - Type of entity (post, page, profile, etc.)
 * @param {string} options.entityId - Entity ID for organization
 * @returns {Promise<Object>} Upload result with URLs and metadata
 */
export const uploadImage = async (fileBuffer, options = {}) => {
  try {
    // Ensure Cloudinary is configured
    configureCloudinary();
    
    console.log('Verificando configuración de Cloudinary...');
    console.log('Variables de entorno:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING', 
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });
    console.log('Cloudinary configurado:', isConfigured());
    
    const {
      folder = 'taita-blog',
      publicId,
      entityType = 'general',
      entityId,
      quality = 'auto',
      fetchFormat = 'auto'
    } = options;

    // Generate public ID if not provided
    const timestamp = Date.now();
    const finalPublicId = publicId || `${entityType}-${entityId || timestamp}`;
    const finalFolder = `${folder}/${entityType}`;

    // Optimize image with Sharp before uploading
    const optimizedBuffer = await sharp(fileBuffer)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85, 
        progressive: true 
      })
      .toBuffer();

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: finalFolder,
          public_id: finalPublicId,
          quality: quality,
          fetch_format: fetchFormat,
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          responsive: true,
          // Generate multiple sizes
          eager: [
            { width: 400, height: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
            { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
          ],
          eager_async: true
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      const stream = Readable.from(optimizedBuffer);
      stream.pipe(uploadStream);
    });

    // Return structured result
    return {
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      cloudinaryId: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      variants: {
        small: cloudinary.url(uploadResult.public_id, {
          width: 400,
          height: 400,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto'
        }),
        medium: cloudinary.url(uploadResult.public_id, {
          width: 800,
          height: 800,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto'
        }),
        large: cloudinary.url(uploadResult.public_id, {
          width: 1200,
          height: 1200,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto'
        }),
        original: uploadResult.secure_url
      },
      metadata: {
        entityType,
        entityId,
        uploadedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteImage = async (publicId) => {
  try {
    // Ensure Cloudinary is configured
    configureCloudinary();
    
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
      publicId
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
  }
};

/**
 * Generate optimized URL for an image
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = 'limit',
    quality = 'auto',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format
  });
};

/**
 * Generate responsive image URLs
 * @param {string} publicId - Cloudinary public ID
 * @returns {Object} Object with different sizes
 */
export const getResponsiveUrls = (publicId) => {
  return {
    thumbnail: getOptimizedUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
    small: getOptimizedUrl(publicId, { width: 400, height: 400 }),
    medium: getOptimizedUrl(publicId, { width: 800, height: 800 }),
    large: getOptimizedUrl(publicId, { width: 1200, height: 1200 }),
    original: cloudinary.url(publicId, { quality: 'auto', fetch_format: 'auto' })
  };
};

/**
 * Check if Cloudinary is properly configured
 * @returns {boolean} Configuration status
 */
export const isConfigured = () => {
  // Ensure configuration is attempted first
  configureCloudinary();
  
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export default {
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  getResponsiveUrls,
  isConfigured
};