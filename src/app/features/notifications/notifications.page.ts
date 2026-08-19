import { Component, signal } from '@angular/core';
import { AppNotification } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationStore } from '../../core/services/notification.store';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDateTime } from '../../core/utils/date.utils';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  imports: [LoadingComponent, PaginationComponent],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Central de atualizações</p>
        <h1>Notificações</h1>
        <p>Informações sobre escalas, folgas e trocas entregues em tempo real.</p>
      </div>
      <span class="realtime-pill realtime-pill--{{ realtime.state() }}"
        ><i aria-hidden="true"></i>{{ realtimeLabel() }}</span
      >
    </header>

    <div class="privacy-banner">
      <span aria-hidden="true">◈</span>
      <p>
        O conteúdo é descriptografado pela API somente após validar sua sessão, organização e
        identidade.
      </p>
    </div>

    @if (store.loading()) {
      <app-loading label="Buscando notificações…" />
    } @else if (store.items().length === 0) {
      <section class="empty-state card">
        <span class="empty-state__icon" aria-hidden="true">◇</span>
        <h2>Você está em dia</h2>
        <p>Novas atualizações aparecerão aqui automaticamente.</p>
      </section>
    } @else {
      <section class="notification-list" aria-label="Lista de notificações">
        @for (notification of store.items(); track notification.id) {
          <article
            class="notification-card card"
            [class.notification-card--unread]="!notification.readAt"
          >
            <button
              type="button"
              class="notification-card__button"
              (click)="open(notification)"
              [attr.aria-expanded]="expandedId() === notification.id"
            >
              <span class="notification-card__icon" aria-hidden="true">{{
                icon(notification.type)
              }}</span>
              <span class="notification-card__copy"
                ><strong>{{ notification.title ?? title(notification.type) }}</strong
                ><span>{{
                  notification.message ?? notification.content ?? 'Abra para consultar os detalhes.'
                }}</span
                ><small>{{ formatDateTime(notification.createdAt) }}</small></span
              >
              @if (!notification.readAt) {
                <span class="unread-dot"><span class="sr-only">Não lida</span></span>
              }
              <span aria-hidden="true">{{ expandedId() === notification.id ? '⌃' : '⌄' }}</span>
            </button>
            @if (expandedId() === notification.id) {
              <div class="notification-card__detail">
                @if (detailLoading()) {
                  <span class="loading-inline"
                    ><span class="spinner" aria-hidden="true"></span> Descriptografando
                    conteúdo…</span
                  >
                } @else if (detail(); as full) {
                  <p>{{ full.content ?? full.message ?? 'Sem detalhes adicionais.' }}</p>
                }
              </div>
            }
          </article>
        }
      </section>
      <app-pagination
        [page]="store.page()"
        [totalPages]="store.totalPages()"
        (change)="store.load($event)"
      />
    }
  `,
})
export class NotificationsPage {
  readonly expandedId = signal<string | null>(null);
  readonly detail = signal<AppNotification | null>(null);
  readonly detailLoading = signal(false);
  readonly formatDateTime = formatDateTime;

  constructor(
    readonly store: NotificationStore,
    readonly realtime: RealtimeService,
    private readonly notifications: NotificationService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
  ) {
    this.store.load();
  }

  open(notification: AppNotification): void {
    if (this.expandedId() === notification.id) {
      this.expandedId.set(null);
      this.detail.set(null);
      return;
    }
    this.expandedId.set(notification.id);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.notifications.get(notification.id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.detailLoading.set(false);
        if (!notification.readAt) {
          this.notifications.markRead(notification.id).subscribe({
            next: () => this.store.markReadLocally(notification.id),
            error: () => undefined,
          });
        }
      },
      error: (error: unknown) => {
        this.detailLoading.set(false);
        this.toasts.show(this.errors.message(error), 'error');
      },
    });
  }

  realtimeLabel(): string {
    return {
      connected: 'Tempo real ativo',
      connecting: 'Conectando…',
      disconnected: 'Tempo real indisponível',
    }[this.realtime.state()];
  }

  icon(type: string): string {
    if (type.includes('SCHEDULE')) return '▦';
    if (type.includes('TIME_OFF')) return '○';
    if (type.includes('SWAP')) return '⇄';
    return '◇';
  }

  title(type: string): string {
    if (type.includes('SCHEDULE')) return 'Atualização da escala';
    if (type.includes('TIME_OFF')) return 'Atualização de folga';
    if (type.includes('SWAP')) return 'Atualização de troca';
    return 'Nova notificação';
  }
}
