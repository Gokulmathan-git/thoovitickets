import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type BucketName = 'avatars' | 'documents' | 'events';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES: Record<BucketName, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  events: ['image/jpeg', 'image/png', 'image/webp'],
};

@Injectable()
export class UploadService {
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('supabase.url'),
      this.configService.getOrThrow<string>('supabase.serviceRoleKey'),
    );
  }

  async upload(
    bucket: BucketName,
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must be under 5MB');
    }

    if (!ALLOWED_TYPES[bucket].includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_TYPES[bucket].join(', ')}`,
      );
    }

    const ext = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw new BadRequestException('File upload failed');
    }

    if (bucket === 'documents') {
      return fileName;
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async getSignedUrl(bucket: BucketName, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw new BadRequestException('Failed to generate signed URL');
    return data.signedUrl;
  }

  async uploadBuffer(
    bucket: BucketName,
    buffer: Buffer,
    contentType: string,
    filePath: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Buffer upload failed: ${error.message}`);
      throw new BadRequestException('File upload failed');
    }

    if (bucket === 'documents') return filePath;

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async delete(bucket: BucketName, path: string): Promise<void> {
    const filePath = bucket === 'documents'
      ? path
      : path.split(`/storage/v1/object/public/${bucket}/`).pop();

    if (!filePath) return;

    await this.supabase.storage.from(bucket).remove([filePath]);
  }
}
