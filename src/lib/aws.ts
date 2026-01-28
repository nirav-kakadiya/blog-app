import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { UploadError } from './errors';
import { logger } from './logger';

class S3Service {
  private client: S3Client | null = null;
  private bucket: string | null = null;

  private getClient(): S3Client {
    if (!this.client) {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION || 'us-east-1';

      if (!accessKeyId || !secretAccessKey) {
        throw new UploadError('AWS credentials not configured');
      }

      this.client = new S3Client({
        region,
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
      this.bucket = process.env.AWS_S3_BUCKET || null;
      if (!this.bucket) {
        throw new UploadError('AWS S3 bucket not configured');
      }
    }
    return this.bucket;
  }

  async uploadImage(
    buffer: Buffer,
    blogId: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const filename = `${uuid()}.${this.getExtension(contentType)}`;
    const key = `blogs/${blogId}/images/${filename}`;

    logger.info('S3 upload starting', { blogId, key });

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        })
      );

      const url = `https://${bucket}.s3.amazonaws.com/${key}`;
      logger.info('S3 upload success', { url });
      return url;
    } catch (error) {
      logger.error('S3 upload error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'S3 upload failed'
      );
    }
  }

  async deleteImage(url: string): Promise<void> {
    const client = this.getClient();
    const bucket = this.getBucket();

    // Extract key from URL
    const urlObj = new URL(url);
    const key = urlObj.pathname.slice(1); // Remove leading /

    logger.info('S3 delete starting', { key });

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      logger.info('S3 delete success', { key });
    } catch (error) {
      logger.error('S3 delete error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'S3 delete failed'
      );
    }
  }

  async listImages(blogId: string): Promise<string[]> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const prefix = `blogs/${blogId}/images/`;

    try {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        })
      );

      return (response.Contents || []).map(
        (obj) => `https://${bucket}.s3.amazonaws.com/${obj.Key}`
      );
    } catch (error) {
      logger.error('S3 list error', { error: String(error) });
      throw new UploadError(
        error instanceof Error ? error.message : 'S3 list failed'
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

export const s3 = new S3Service();
