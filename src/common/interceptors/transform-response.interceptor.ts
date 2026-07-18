import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((res) => {
        // If the response is already formatted or has 'meta', unwrap gracefully
        if (res && typeof res === 'object' && 'meta' in res && 'data' in res) {
          return {
            success: true,
            data: res.data as T,
            meta: res.meta,
            timestamp: new Date().toISOString(),
          };
        }

        if (res && typeof res === 'object' && 'success' in res && 'timestamp' in res) {
          return res as ApiResponseDto<T>;
        }

        return {
          success: true,
          data: res,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
