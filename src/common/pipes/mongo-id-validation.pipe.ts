import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { Types } from 'mongoose';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Injectable()
export class MongoIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException({
        success: false,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: `Invalid ObjectId format for parameter '${metadata.data || 'id'}': ${value}`,
        timestamp: new Date().toISOString(),
      });
    }
    return value;
  }
}
