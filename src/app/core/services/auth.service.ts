import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  Subscription,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, SessionEndReason } from '../models/api.models';

export type AuthState = 'checking' | 'authenticated' | 'anonymous';

const SESSION_RESTORE_TIMEOUT_MS = 3_000;
const REFRESH_LOCK_NAME = 'schedule-manager.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenState = signal<string | null>(null);
  private readonly expiresAtState = signal<number | null>(null);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly authState = signal<AuthState>('checking');
  private refreshRequest: Observable<AuthResponse> | null = null;

  readonly user = this.userState.asReadonly();
  readonly expiresAt = this.expiresAtState.asReadonly();
  readonly state = this.authState.asReadonly();
  readonly isAuthenticated = computed(
    () =>
      this.authState() === 'authenticated' &&
      this.user() !== null &&
      this.accessTokenState() !== null,
  );
  readonly isManager = computed(() => this.user()?.role === 'MANAGER');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  accessToken(): string | null {
    return this.accessTokenState();
  }

  async restoreSession(): Promise<void> {
    try {
      await firstValueFrom(
        this.refreshAccessToken().pipe(timeout({ first: SESSION_RESTORE_TIMEOUT_MS })),
      );
    } catch {
      this.clearSession();
    }
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(
        `${environment.apiBaseUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => this.applySession(response)),
        map((response) => response.user),
      );
  }

  activate(email: string, activationCode: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/activate`, {
      email,
      activationCode,
      newPassword,
    });
  }

  refreshAccessToken(): Observable<AuthResponse> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    this.refreshRequest = this.createRefreshRequest().pipe(
      finalize(() => {
        this.refreshRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.refreshRequest;
  }

  loadCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${environment.apiBaseUrl}/auth/me`)
      .pipe(tap((user) => this.userState.set(user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        tap(() => this.endSession('logout')),
      );
  }

  endSession(reason: SessionEndReason): void {
    this.clearSession();
    const queryParams = reason === 'logout' ? undefined : { reason };
    void this.router.navigate(['/login'], { queryParams, replaceUrl: true });
  }

  failRefresh(error: unknown): Observable<never> {
    this.endSession('expired');
    return throwError(() => error);
  }

  private applySession(response: AuthResponse): void {
    this.accessTokenState.set(response.accessToken);
    this.expiresAtState.set(Date.now() + response.expiresIn * 1000);
    this.userState.set(response.user);
    this.authState.set('authenticated');
  }

  private createRefreshRequest(): Observable<AuthResponse> {
    const request = (): Observable<AuthResponse> =>
      this.http
        .post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh`, {}, { withCredentials: true })
        .pipe(tap((response) => this.applySession(response)));

    if (typeof navigator === 'undefined' || !navigator.locks) return request();

    return new Observable<AuthResponse>((subscriber) => {
      const abortController = new AbortController();
      let requestSubscription: Subscription | null = null;
      let releaseLock: (() => void) | null = null;

      void navigator.locks
        .request(
          REFRESH_LOCK_NAME,
          { signal: abortController.signal },
          () =>
            new Promise<void>((resolve) => {
              releaseLock = resolve;
              if (subscriber.closed) {
                resolve();
                return;
              }
              requestSubscription = request().subscribe({
                next: (response) => subscriber.next(response),
                error: (error: unknown) => {
                  subscriber.error(error);
                  resolve();
                },
                complete: () => {
                  subscriber.complete();
                  resolve();
                },
              });
            }),
        )
        .catch((error: unknown) => {
          if (!subscriber.closed && (!(error instanceof Error) || error.name !== 'AbortError'))
            subscriber.error(error);
        });

      return () => {
        abortController.abort();
        requestSubscription?.unsubscribe();
        releaseLock?.();
      };
    });
  }

  private clearSession(): void {
    this.accessTokenState.set(null);
    this.expiresAtState.set(null);
    this.userState.set(null);
    this.authState.set('anonymous');
  }
}
