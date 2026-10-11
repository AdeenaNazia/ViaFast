import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${request.method} ${request.originalUrl} ${response.statusCode} +${Date.now() - startedAt}ms`,
          );
        },
        error: (error: unknown) => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn(
            `${request.method} ${request.originalUrl} ${statusCode} +${Date.now() - startedAt}ms`,
          );
        },
      }),
    );
  }
}
