import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const requestId = request.headers['x-request-id'] || '-';
    const userAgent = request.headers['user-agent'] || '-';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${response.statusCode} ${duration}ms [${requestId}] ${ip} "${userAgent.slice(0, 50)}"`,
        );
      }),
    );
  }
}
