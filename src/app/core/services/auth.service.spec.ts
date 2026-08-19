import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthResponse } from '../models/api.models';
import { AuthService } from './auth.service';

const AUTH_RESPONSE: AuthResponse = {
  accessToken: 'short-lived-access-token',
  tokenType: 'Bearer',
  expiresIn: 300,
  user: {
    id: '01900000-0000-7000-8000-000000000001',
    employeeId: '01900000-0000-7000-8000-000000000002',
    name: 'João da Silva',
    role: 'EMPLOYEE',
    organizationId: '01900000-0000-7000-8000-000000000003',
  },
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the access token only in memory after login', () => {
    auth.login('joao@empresa.com', 'frase-senha-segura').subscribe();
    const request = http.expectOne('/api/v1/auth/login');

    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush(AUTH_RESPONSE);

    expect(auth.accessToken()).toBe(AUTH_RESPONSE.accessToken);
    expect(auth.user()?.role).toBe('EMPLOYEE');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('sends the refresh cookie credentials and replaces the in-memory token', () => {
    auth.refreshAccessToken().subscribe();
    const request = http.expectOne('/api/v1/auth/refresh');

    expect(request.request.withCredentials).toBe(true);
    request.flush({ ...AUTH_RESPONSE, accessToken: 'rotated-access-token' });

    expect(auth.accessToken()).toBe('rotated-access-token');
    expect(auth.state()).toBe('authenticated');
  });

  it('serializes refresh rotation with the browser lock when available', () => {
    const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
    const lockRequest = vi.fn(
      (_name: string, _options: object, callback: (lock: object) => Promise<void>): Promise<void> =>
        callback({}),
    );
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: lockRequest },
    });

    try {
      auth.refreshAccessToken().subscribe();
      const request = http.expectOne('/api/v1/auth/refresh');
      request.flush(AUTH_RESPONSE);

      expect(lockRequest).toHaveBeenCalledOnce();
      expect(auth.accessToken()).toBe(AUTH_RESPONSE.accessToken);
    } finally {
      if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });

  it('does not block bootstrap indefinitely when session restore cannot reach the API', async () => {
    vi.useFakeTimers();
    try {
      const restoration = auth.restoreSession();
      const request = http.expectOne('/api/v1/auth/refresh');

      await vi.advanceTimersByTimeAsync(3_001);
      await restoration;

      expect(request.cancelled).toBe(true);
      expect(auth.state()).toBe('anonymous');
      expect(auth.accessToken()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
