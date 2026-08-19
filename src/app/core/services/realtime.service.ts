import { Injectable, effect, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { NotificationSignal } from '../models/api.models';
import { AuthService } from './auth.service';
import { NotificationStore } from './notification.store';
import { RefreshSchedulerService } from './refresh-scheduler.service';

export type RealtimeState = 'disconnected' | 'connecting' | 'connected';

const INITIAL_RETRY_DELAYS_MS = [2_000, 10_000, 30_000] as const;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly state = signal<RealtimeState>('disconnected');
  private connection: HubConnection | null = null;
  private retryTimer: number | null = null;
  private retryAttempt = 0;

  constructor(
    private readonly auth: AuthService,
    private readonly notificationStore: NotificationStore,
    _refreshScheduler: RefreshSchedulerService,
  ) {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.connect();
      } else {
        this.notificationStore.clear();
        void this.disconnect();
      }
    });
  }

  private async connect(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    if (
      this.connection?.state === HubConnectionState.Connected ||
      this.connection?.state === HubConnectionState.Connecting
    ) {
      return;
    }

    this.state.set('connecting');
    this.clearRetryTimer();
    const connection = this.connection ?? this.createConnection();
    this.connection = connection;

    try {
      await connection.start();
      if (this.connection !== connection || !this.auth.isAuthenticated()) {
        await connection.stop();
        return;
      }
      this.retryAttempt = 0;
      this.state.set('connected');
      this.notificationStore.load(this.notificationStore.page());
    } catch {
      if (this.connection === connection) {
        this.state.set('disconnected');
        this.scheduleRetry();
      }
    }
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(environment.notificationsHubUrl, {
        accessTokenFactory: () => this.auth.accessToken() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('session.revoked', () => {
      void connection.stop();
      this.auth.endSession('revoked');
    });
    const receive = (payload: NotificationSignal): void => {
      if (payload?.notificationId) {
        this.notificationStore.receive(payload.notificationId);
      }
    };
    connection.on('notification.created', receive);
    connection.onreconnecting(() => this.state.set('connecting'));
    connection.onreconnected(() => {
      this.retryAttempt = 0;
      this.state.set('connected');
      this.notificationStore.load(this.notificationStore.page());
    });
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.state.set('disconnected');
      this.scheduleRetry();
    });
    return connection;
  }

  private async disconnect(): Promise<void> {
    this.clearRetryTimer();
    this.retryAttempt = 0;
    if (!this.connection) {
      this.state.set('disconnected');
      return;
    }
    const current = this.connection;
    this.connection = null;
    try {
      await current.stop();
    } finally {
      if (!this.connection) this.state.set('disconnected');
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null || !this.auth.isAuthenticated()) return;
    const delay =
      INITIAL_RETRY_DELAYS_MS[Math.min(this.retryAttempt, INITIAL_RETRY_DELAYS_MS.length - 1)];
    this.retryAttempt += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer === null) return;
    window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
