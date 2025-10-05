import { jest } from '@jest/globals';

// Mock dependencies using jest.unstable_mockModule for ES Modules
jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn().mockReturnValue({}), // Return an empty object to avoid errors on .cloud_name
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    url: jest.fn(),
  },
}));

jest.unstable_mockModule('sharp', () => ({
  default: jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized-image')),
  })),
}));

describe('Cloudinary Service', () => {
  let cloudinary;
  let sharp;
  let cloudinaryService;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset process.env before each test
    process.env = { ...originalEnv };

    // Dynamically import and re-assign modules for each test
    const { v2 } = await import('cloudinary');
    const sharpModule = (await import('sharp')).default;
    const service = await import('./cloudinary.js');

    cloudinary = v2;
    sharp = sharpModule;
    cloudinaryService = service;

    // Set up environment variables
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe('isConfigured', () => {
    it('should return true if all environment variables are set', () => {
      expect(cloudinaryService.isConfigured()).toBe(true);
    });

    it('should return false if CLOUDINARY_CLOUD_NAME is missing', () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      expect(cloudinaryService.isConfigured()).toBe(false);
    });

    it('should return false if CLOUDINARY_API_KEY is missing', () => {
      delete process.env.CLOUDINARY_API_KEY;
      expect(cloudinaryService.isConfigured()).toBe(false);
    });

    it('should return false if CLOUDINARY_API_SECRET is missing', () => {
      delete process.env.CLOUDINARY_API_SECRET;
      expect(cloudinaryService.isConfigured()).toBe(false);
    });
  });

  describe('uploadImage', () => {
    it('should upload an image and return structured data', async () => {
      const fileBuffer = Buffer.from('test-image');
      const mockUploadResult = {
        public_id: 'test-public-id',
        secure_url: 'https://cloudinary.com/test.jpg',
        format: 'jpg',
        width: 800,
        height: 600,
        bytes: 12345,
      };

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockUploadResult);
        return { pipe: jest.fn() }; // Mock stream object
      });

      const result = await cloudinaryService.uploadImage(fileBuffer, { entityType: 'post', entityId: '123' });

      expect(sharp).toHaveBeenCalledWith(fileBuffer);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('url', mockUploadResult.secure_url);
    });

    it('should handle errors during upload', async () => {
      const fileBuffer = Buffer.from('test-image');
      const errorMessage = 'Upload failed';

      cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(new Error(errorMessage));
        return { pipe: jest.fn() }; // Mock stream object
      });

      await expect(cloudinaryService.uploadImage(fileBuffer)).rejects.toThrow(
        `Failed to upload image to Cloudinary: ${errorMessage}`
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete an image successfully', async () => {
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const result = await cloudinaryService.deleteImage('test-public-id');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('test-public-id');
      expect(result).toEqual({ success: true, result: 'ok', publicId: 'test-public-id' });
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Deletion failed';
      cloudinary.uploader.destroy.mockRejectedValue(new Error(errorMessage));

      await expect(cloudinaryService.deleteImage('test-public-id')).rejects.toThrow(
        `Failed to delete image from Cloudinary: ${errorMessage}`
      );
    });
  });

  describe('getOptimizedUrl', () => {
    it('should return an optimized URL', () => {
      const publicId = 'test-public-id';
      const options = { width: 500, height: 500, crop: 'fill' };
      const expectedUrl = 'https://cloudinary.com/w_500,h_500,c_fill/test.jpg';
      cloudinary.url.mockReturnValue(expectedUrl);

      const result = cloudinaryService.getOptimizedUrl(publicId, options);

      expect(cloudinary.url).toHaveBeenCalledWith(publicId, expect.any(Object));
      expect(result).toBe(expectedUrl);
    });
  });

  describe('getResponsiveUrls', () => {
    it('should return a set of responsive URLs', () => {
      const publicId = 'test-public-id';
      cloudinary.url.mockImplementation((id, options) => `https://cloudinary.com/${options.width || ''}test.jpg`);

      const urls = cloudinaryService.getResponsiveUrls(publicId);

      expect(urls).toHaveProperty('thumbnail');
      expect(urls).toHaveProperty('small');
      expect(urls).toHaveProperty('medium');
      expect(urls).toHaveProperty('large');
      expect(urls).toHaveProperty('original');
      expect(cloudinary.url).toHaveBeenCalledTimes(5);
    });
  });
});