import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Catch(MongooseError)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);

  catch(exception: MongooseError & { code?: number; keyValue?: Record<string, unknown> }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Database error occurred';
    let errorCode = ERROR_CODES.INTERNAL_ERROR;

    if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
      message = Object.values(exception.errors).map((err) => err.message);
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
      message = `Invalid format for field ${exception.path}: ${exception.value}`;
    } else if (exception.code === 11000) {
      status = HttpStatus.CONFLICT;
      errorCode = ERROR_CODES.DUPLICATE_RESOURCE;
      const duplicateFields = exception.keyValue ? Object.keys(exception.keyValue).join(', ') : 'field';
      message = `Duplicate entry found for resource on ${duplicateFields}`;
    } else {
      this.logger.error(`Mongoose Exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
