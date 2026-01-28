import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { UploadError } from './errors';
import { logger } from './logger';

class R2Service {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private baseUrl: string | null = null;
  private folder: string | null = null;

  private getClient(): S3Client {
    if (!this.client) {
      const accessKeyId = process.env.R2_ACCESS_KEY;
      const secretAccessKey = process.env.R2_SECRET_KEY;
      const accountId = process.env.R2_ACCOUNT_ID;

      if (!accessKeyId || !secretAccessKey || !accountId) {
        throw new UploadError('R2 credentials not configured');
      }

      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
    return this.client;
  }

  private getBucket(): string {
    if (!this.bucket) {
      this.bucket = process.env.R2_BUCKET || null;
      if (!this.bucket) {
        throw new UploadError('R2 bucket not configured');
      }
    }
    return this.bucket;
  }

  private getBaseUrl(): string {
    if (!this.baseUrl) {
      this.baseUrl = process.env.R2_BASE_URL || null;
      if (!this.baseUrl) {
        throw new UploadError('R2 base URL not configured');
      }
      // Remove trailing slash if present
      this.baseUrl = this.baseUrl.replace(/\/$/, '');
    }
    return this.baseUrl;
  }

  private getFolder(): string {
    if (!this.folder) {
      this.folder = process.env.R2_FOLDER || 'blog-generator';
    }
    return this.folder;
  }

  async uploadImage(
    buffer: Buffer,
    blogId: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const baseUrl = this.getBaseUrl();
    const folder = this.getFolder();

    const filename = `${uuid()}.${this.getExtension(contentType)}`;
    const key = `${folder}/${blogId}/${filename}`;

    logger.info('R2 upload starting', { blogId, key });

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const url = `${baseUrl}/${key}`;
      logger.info('R2 upload success', { url });
      return url;
    } catch (error) {
      logger.error('R2 upload error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'R2 upload failed'
      );
    }
  }

  async deleteImage(url: string): Promise<void> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const baseUrl = this.getBaseUrl();

    // Extract key from URL
    const key = url.replace(`${baseUrl}/`, '');

    logger.info('R2 delete starting', { key });

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      logger.info('R2 delete success', { key });
    } catch (error) {
      logger.error('R2 delete error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'R2 delete failed'
      );
    }
  }

  async listImages(blogId: string): Promise<string[]> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const baseUrl = this.getBaseUrl();
    const folder = this.getFolder();
    const prefix = `${folder}/${blogId}/`;

    try {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        })
      );

      return (response.Contents || []).map(
        (obj) => `${baseUrl}/${obj.Key}`
      );
    } catch (error) {
      logger.error('R2 list error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'R2 list failed'
      );
    }
  }

  private getExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return extensions[contentType] || 'png';
  }
}

export const r2 = new R2Service();
