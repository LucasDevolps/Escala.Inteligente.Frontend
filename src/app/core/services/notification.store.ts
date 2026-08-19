import { Injectable, computed, signal } from '@angular/core';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { AppNotification } from '../models/api.models';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  readonly items = signal<readonly AppNotification[]>([]);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalPages = signal(0);
  readonly totalItems = signal(0);
  readonly unreadCount = computed(
    () => this.items().filter((notification) => !notification.readAt).length,
  );

  constructor(private readonly notifications: NotificationService) {}

  private loadSequence = 0;
  private sessionGeneration = 0;

  load(page = 1): void {
    const sequence = ++this.loadSequence;
    const generation = this.sessionGeneration;
    this.loading.set(true);
    this.notifications
      .list(page)
      .pipe(
        tap((response) => {
          if (sequence !== this.loadSequence || generation !== this.sessionGeneration) return;
          this.items.set(response.items);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
        }),
        catchError(() => EMPTY),
        finalize(() => {
          if (sequence === this.loadSequence && generation === this.sessionGeneration)
            this.loading.set(false);
        }),
      )
      .subscribe();
  }

  receive(notificationId: string): void {
    const generation = this.sessionGeneration;
    this.notifications.get(notificationId).subscribe({
      next: (notification) => {
        if (generation !== this.sessionGeneration) return;
        const alreadyPresent = this.items().some((item) => item.id === notification.id);
        if (alreadyPresent) {
          this.replace(notification);
          return;
        }

        const totalItems = this.totalItems() + 1;
        this.totalItems.set(totalItems);
        this.totalPages.set(Math.ceil(totalItems / this.pageSize()));
        if (this.page() === 1) {
          this.items.update((items) => [notification, ...items].slice(0, this.pageSize()));
        } else {
          this.load(this.page());
        }
      },
    });
  }

  replace(notification: AppNotification): void {
    this.items.update((items) =>
      items.map((item) => (item.id === notification.id ? notification : item)),
    );
  }

  markReadLocally(id: string, readAt = new Date().toISOString()): void {
    this.items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, readAt } : item)),
    );
  }

  clear(): void {
    this.sessionGeneration += 1;
    this.loadSequence += 1;
    this.items.set([]);
    this.loading.set(false);
    this.page.set(1);
    this.pageSize.set(20);
    this.totalPages.set(0);
    this.totalItems.set(0);
  }
}
