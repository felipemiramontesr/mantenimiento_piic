import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: User Routes
 * Implementation: 100% Path Coverage (Sovereign Quality)
 * v.3.0.0 - Base64 JSON Transport Tests
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    default: {
      ...actual.default,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      createReadStream: vi.fn(),
      existsSync: vi.fn(),
    },
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    createReadStream: vi.fn(),
    existsSync: vi.fn(),
  };
});

// Minimal 1x1 white JPEG in Base64
const VALID_BASE64_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKkA/9k=';

// Minimal 1x1 white PNG in Base64
const VALID_BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

describe('User Integration Endpoints', () => {
  const app = buildApp();
  let token: string;

  beforeEach(async () => {
    await app.ready();
    token = app.jwt.sign({ id: 1, username: 'admin', roleId: 1 });
    vi.resetAllMocks();
  });

  describe('POST /v1/users/:id/upload-profile', () => {
    it('should return 401 if no session is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if trying to upload to another user (Identity Lock)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/2/upload-profile', // Token is for ID 1
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toContain('Unauthorized Identity Access');
    });

    it('should return 404 if identity is not found', async () => {
      const customToken = app.jwt.sign({ id: 999, username: 'ghost', roleId: 2 });
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/999/upload-profile',
        headers: {
          authorization: `Bearer ${customToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Identity not found');
    });

    it('should return 400 if no image data is received', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({}),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('No image data received');
    });

    it('should return 400 for invalid mime-types', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: 'data:text/plain;base64,aGVsbG8=', mime: 'text/plain' }),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('Only JPG and PNG');
    });

    it('should return 400 if image exceeds 2MB', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      // Create a Base64 string that decodes to >2MB
      const bigBuffer = Buffer.alloc(2.1 * 1024 * 1024, 'A');
      const bigBase64 = bigBuffer.toString('base64');

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: bigBase64, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('2MB');
    });

    it('should successfully upload JPEG profile picture', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET profile_picture_url'),
        expect.any(Array)
      );
    });

    it('should successfully upload PNG profile picture', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_PNG, mime: 'image/png' }),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('should default to image/jpeg if no mime is provided', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG }),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle infrastructure failure during persistence', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);
      (fs.writeFileSync as Mock).mockImplementation(() => {
        throw new Error('DISK_FULL');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Infrastructure failure');
    });
  });

  describe('GET /v1/users/:id/profile-image', () => {
    it('should return 404 if image is not found in registry (No Token Required)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Image not found');
    });

    it('should return 404 with path_attempted and dir_contents when asset is missing', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'missing.jpg' }]]);
      (fs.existsSync as Mock).mockImplementation(
        (pathStr: string) =>
          // Return true only for the base directory, false for the actual file
          pathStr.includes('profiles') && !pathStr.includes('missing.jpg')
      );
      (fs.readdirSync as Mock).mockReturnValueOnce(['old_image.jpg']);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Physical asset missing');
      expect(body.path_attempted).toBeDefined();
      expect(body.dir_contents).toEqual(['old_image.jpg']);
    });

    it('should ignore read errors for debug payload', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'missing.jpg' }]]);
      (fs.existsSync as Mock).mockImplementation(
        (pathStr: string) => pathStr.includes('profiles') && !pathStr.includes('missing.jpg')
      );
      (fs.readdirSync as Mock).mockImplementationOnce(() => {
        throw new Error('EACCES');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Physical asset missing');
      expect(body.dir_contents).toEqual([]);
    });

    it('should return debug_path instead of path_attempted in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'missing.jpg' }]]);
      (fs.existsSync as Mock).mockReturnValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.debug_path).toBeDefined();
      expect(body.path_attempted).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should serve the image with correct content type', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'user1.png' }]]);
      (fs.existsSync as Mock).mockReturnValue(true);

      const mockStream = new PassThrough();
      (fs.createReadStream as Mock).mockReturnValue(mockStream);

      setTimeout(() => {
        mockStream.end('fake-image-data');
      }, 0);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should serve JPG images with correct content type', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'user1.jpg' }]]);
      (fs.existsSync as Mock).mockReturnValue(true);

      const mockStream = new PassThrough();
      (fs.createReadStream as Mock).mockReturnValue(mockStream);

      setTimeout(() => {
        mockStream.end('fake-image-data');
      }, 0);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should handle storage access exception', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('PERM_DENIED'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Storage access exception');
    });
  });
});
