import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('storage.cloudinary.cloudName');
    const apiKey = this.configService.get<string>('storage.cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('storage.cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    } else {
      this.logger.warn('Cloudinary is not configured correctly. Uploads may fail.');
    }
  }

  async uploadPdf(buffer: Buffer, filename: string): Promise<{ publicId: string; url: string }> {
    return new Promise((resolve, reject) => {
      const uniqueId = uuidv4();
      const publicId = `receipts/${uniqueId}-${filename}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // Use 'raw' for PDFs or non-image files if you want to deliver as a file
          public_id: publicId,
          format: 'pdf',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Failed to upload ${filename} to Cloudinary`, error);
            return reject(new InternalServerErrorException('Failed to upload file to storage'));
          }

          this.logger.log(`Successfully uploaded ${filename} to Cloudinary (Public ID: ${result.public_id})`);
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}
