export class ApiResponseDto<T> {
  success!: boolean;
  message?: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    [key: string]: unknown;
  };
  timestamp!: string;
}

export class ErrorResponseDto {
  success!: boolean;
  errorCode!: string;
  message!: string | string[];
  path?: string;
  timestamp!: string;
}
