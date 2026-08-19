import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ProblemDetails } from '../models/api.models';
import { ActivityService } from '../services/activity.service';
import { AuthService } from '../services/auth.service';

const WAS_RETRIED = new HttpContextToken<boolean>(() => false);
const TERMINAL_SESSION_CODES = new Set([
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_REUSE',
]);

export function authInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn) {
  const auth = inject(AuthService);
  const activity = inject(ActivityService);
  const isApiRequest = request.url.startsWith('/api/');
  const isAuthRequest =
    request.url.includes('/auth/login') ||
    request.url.includes('/auth/activate') ||
    request.url.includes('/auth/refresh');
  const needsCookie = request.url.includes('/auth/refresh') || request.url.includes('/auth/logout');
  const token = auth.accessToken();

  let outgoing = request;
  if (isApiRequest && token && !request.url.includes('/auth/refresh')) {
    outgoing = outgoing.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  if (needsCookie && !outgoing.withCredentials) {
    outgoing = outgoing.clone({ withCredentials: true });
  }

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApiRequest) {
        return throwError(() => error);
      }

      const problem =
        error.error && typeof error.error === 'object' ? (error.error as ProblemDetails) : null;
      if (isAuthRequest) {
        return throwError(() => error);
      }
      if (problem?.code && TERMINAL_SESSION_CODES.has(problem.code)) {
        auth.endSession(problem.code === 'SESSION_REVOKED' ? 'revoked' : 'expired');
        return throwError(() => error);
      }

      if (request.context.get(WAS_RETRIED) || !token || !activity.wasRecentlyActive()) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap(() => {
          const renewedToken = auth.accessToken();
          const retried = request.clone({
            context: request.context.set(WAS_RETRIED, true),
            setHeaders: renewedToken ? { Authorization: `Bearer ${renewedToken}` } : {},
          });
          return next(retried);
        }),
        catchError((refreshError: unknown) => auth.failRefresh(refreshError)),
      );
    }),
  );
}
