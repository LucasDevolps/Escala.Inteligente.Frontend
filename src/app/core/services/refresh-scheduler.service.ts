import { Injectable, effect, signal } from '@angular/core';
import { EMPTY, catchError, finalize } from 'rxjs';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';

const REFRESH_MARGIN_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class RefreshSchedulerService {
  private readonly clock = signal(Date.now());
  private refreshing = false;

  constructor(
    private readonly auth: AuthService,
    private readonly activity: ActivityService,
  ) {
    effect((onCleanup) => {
      const expiresAt = this.auth.expiresAt();
      const state = this.auth.state();
      this.activity.lastActivityAt();
      this.clock();

      if (state !== 'authenticated' || !expiresAt) {
        return;
      }

      const delay = expiresAt - Date.now() - REFRESH_MARGIN_MS;
      if (delay > 0) {
        const timer = window.setTimeout(() => this.clock.set(Date.now()), delay);
        onCleanup(() => window.clearTimeout(timer));
        return;
      }

      if (this.activity.wasRecentlyActive() && !this.refreshing) {
        this.refreshing = true;
        this.auth
          .refreshAccessToken()
          .pipe(
            catchError((error: unknown) => {
              this.auth.endSession('expired');
              return EMPTY;
            }),
            finalize(() => {
              this.refreshing = false;
            }),
          )
          .subscribe();
      }
    });
  }
}
