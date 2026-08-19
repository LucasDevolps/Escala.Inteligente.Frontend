import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize } from 'rxjs';
import { Schedule, ShiftSwap, TimeOffRequest } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationStore } from '../../core/services/notification.store';
import { ScheduleService } from '../../core/services/schedule.service';
import { ShiftSwapService } from '../../core/services/shift-swap.service';
import { TimeOffService } from '../../core/services/time-off.service';
import {
  formatDate,
  formatDateTime,
  monthTitle,
  moveMonth,
  todayIso,
} from '../../core/utils/date.utils';
import { LoadingComponent } from '../../shared/components/loading.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  imports: [RouterLink, LoadingComponent, StatusBadgeComponent],
  template: `
    <header class="page-header page-header--dashboard">
      <div>
        <p class="eyebrow">{{ greeting() }}</p>
        <h1>{{ firstName() }}, veja o que importa hoje.</h1>
        <p>
          {{
            auth.isManager()
              ? 'Acompanhe a operação e resolva pendências com tranquilidade.'
              : 'Sua escala e suas solicitações, sempre à mão.'
          }}
        </p>
      </div>
      <div class="date-chip"><span aria-hidden="true">◷</span>{{ todayLabel }}</div>
    </header>

    @if (loading()) {
      <app-loading label="Preparando sua visão geral…" />
    } @else if (auth.isManager()) {
      <section class="metric-grid" aria-label="Resumo da operação">
        <a class="metric-card metric-card--brand" [routerLink]="schedulePath()">
          <div class="metric-card__icon" aria-hidden="true">▦</div>
          <div>
            <small>Escala do mês</small
            ><strong>{{
              schedule()?.status === 'PUBLISHED'
                ? 'Publicada'
                : schedule()
                  ? 'Em preparação'
                  : 'Não criada'
            }}</strong
            ><span>{{ currentMonthTitle }}</span>
          </div>
          <span class="metric-card__arrow" aria-hidden="true">→</span>
        </a>
        <a class="metric-card" routerLink="/time-off">
          <div class="metric-card__icon metric-card__icon--amber" aria-hidden="true">○</div>
          <div>
            <small>Folgas pendentes</small><strong>{{ pendingTimeOffTotal() }}</strong
            ><span>{{
              pendingTimeOffTotal() === 1
                ? 'solicitação aguarda análise'
                : 'solicitações aguardam análise'
            }}</span>
          </div>
          <span class="metric-card__arrow" aria-hidden="true">→</span>
        </a>
        <a class="metric-card" routerLink="/swaps">
          <div class="metric-card__icon metric-card__icon--blue" aria-hidden="true">⇄</div>
          <div>
            <small>Trocas recentes</small><strong>{{ recentSwaps().length }}</strong
            ><span>movimentações acompanhadas</span>
          </div>
          <span class="metric-card__arrow" aria-hidden="true">→</span>
        </a>
        <a class="metric-card" routerLink="/notifications">
          <div class="metric-card__icon metric-card__icon--violet" aria-hidden="true">◇</div>
          <div>
            <small>Não lidas</small><strong>{{ notifications.unreadCount() }}</strong
            ><span>notificações novas</span>
          </div>
          <span class="metric-card__arrow" aria-hidden="true">→</span>
        </a>
      </section>

      <div class="dashboard-columns">
        <section class="card dashboard-panel">
          <header class="card__header">
            <div>
              <p class="eyebrow">Atenção necessária</p>
              <h2>Solicitações de folga</h2>
            </div>
            <a routerLink="/time-off">Ver todas</a>
          </header>
          @if (pendingTimeOff().length === 0) {
            <div class="compact-empty">
              <span aria-hidden="true">✓</span>
              <p><strong>Tudo em dia</strong><br />Nenhuma solicitação pendente.</p>
            </div>
          } @else {
            <ul class="activity-list">
              @for (request of pendingTimeOff().slice(0, 4); track request.id) {
                <li>
                  <span class="activity-list__avatar" aria-hidden="true">{{
                    initials(request.employeeName)
                  }}</span>
                  <div>
                    <strong>{{ request.employeeName ?? 'Colaborador' }}</strong
                    ><span>Solicita folga em {{ formatDate(request.date) }}</span>
                  </div>
                  <app-status-badge status="PENDING" />
                </li>
              }
            </ul>
          }
        </section>

        <section class="card dashboard-panel">
          <header class="card__header">
            <div>
              <p class="eyebrow">Cobertura</p>
              <h2>Alertas da escala</h2>
            </div>
            <a [routerLink]="schedulePath()">Abrir escala</a>
          </header>
          @if ((schedule()?.warnings?.length ?? 0) === 0) {
            <div class="compact-empty">
              <span aria-hidden="true">✓</span>
              <p><strong>Cobertura equilibrada</strong><br />Nenhum alerta para este mês.</p>
            </div>
          } @else {
            <ul class="warning-list">
              @for (warning of schedule()?.warnings?.slice(0, 4); track $index) {
                <li>
                  <span aria-hidden="true">!</span>
                  <div>
                    <strong>{{ warning.date ? formatDate(warning.date) : 'Atenção' }}</strong>
                    <p>{{ warning.message }}</p>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    } @else {
      <section class="employee-hero card">
        <div class="employee-hero__icon" aria-hidden="true">▦</div>
        <div>
          <p class="eyebrow">Próximo dia de trabalho</p>
          @if (nextAssignment(); as assignment) {
            <h2>{{ formatDate(assignment.workDate) }}</h2>
            <p>Sua escala publicada está atualizada. Consulte o mês para ver os demais dias.</p>
          } @else {
            <h2>Nenhum dia encontrado</h2>
            <p>A escala deste mês pode ainda não ter sido publicada.</p>
          }
        </div>
        <a class="button button--primary" [routerLink]="schedulePath()">Ver minha escala</a>
      </section>

      <section class="quick-actions" aria-labelledby="quick-actions-title">
        <header>
          <p class="eyebrow">Acesso rápido</p>
          <h2 id="quick-actions-title">O que você precisa?</h2>
        </header>
        <div class="quick-actions__grid">
          <a class="quick-action" routerLink="/schedule"
            ><span aria-hidden="true">▦</span><strong>Minha escala</strong
            ><small>Veja seus dias de trabalho</small></a
          >
          <a class="quick-action" routerLink="/time-off/new"
            ><span aria-hidden="true">○</span><strong>Solicitar folga</strong
            ><small>Avise com antecedência</small></a
          >
          <a class="quick-action" routerLink="/swaps"
            ><span aria-hidden="true">⇄</span><strong>Solicitar troca</strong
            ><small>Encontre um colega disponível</small></a
          >
          <a class="quick-action" routerLink="/notifications"
            ><span aria-hidden="true">◇</span><strong>Notificações</strong
            ><small>{{ notifications.unreadCount() }} não lidas</small></a
          >
        </div>
      </section>

      <section class="card dashboard-panel notifications-preview">
        <header class="card__header">
          <div>
            <p class="eyebrow">Atualizações</p>
            <h2>Notificações recentes</h2>
          </div>
          <a routerLink="/notifications">Ver todas</a>
        </header>
        @if (notifications.items().length === 0) {
          <div class="compact-empty">
            <span aria-hidden="true">◇</span>
            <p><strong>Sem novidades</strong><br />As atualizações aparecerão aqui.</p>
          </div>
        } @else {
          <ul class="activity-list">
            @for (notification of notifications.items().slice(0, 4); track notification.id) {
              <li [class.activity-list__unread]="!notification.readAt">
                <span class="activity-list__dot" aria-hidden="true"></span>
                <div>
                  <strong>{{ notification.title ?? 'Nova atualização' }}</strong
                  ><span
                    >{{ notification.message ?? notification.content ?? notification.type }} ·
                    {{ formatDateTime(notification.createdAt) }}</span
                  >
                </div>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class DashboardPage {
  readonly loading = signal(true);
  readonly schedule = signal<Schedule | null>(null);
  readonly nextSchedule = signal<Schedule | null>(null);
  readonly pendingTimeOff = signal<readonly TimeOffRequest[]>([]);
  readonly pendingTimeOffTotal = signal(0);
  readonly recentSwaps = signal<readonly ShiftSwap[]>([]);
  readonly todayLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
  readonly currentMonthTitle = monthTitle(new Date().getFullYear(), new Date().getMonth() + 1);
  readonly firstName = computed(() => this.auth.user()?.name.split(/\s+/)[0] ?? 'Olá');
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  });
  readonly nextAssignment = computed(
    () =>
      [...(this.schedule()?.assignments ?? []), ...(this.nextSchedule()?.assignments ?? [])]
        .filter(
          (assignment) =>
            assignment.workDate >= todayIso() &&
            (!this.auth.user()?.employeeId ||
              assignment.employeeId === this.auth.user()?.employeeId),
        )
        .sort((left, right) => left.workDate.localeCompare(right.workDate))[0] ?? null,
  );

  private pendingLoads = 1;

  constructor(
    readonly auth: AuthService,
    readonly notifications: NotificationStore,
    private readonly schedules: ScheduleService,
    private readonly timeOff: TimeOffService,
    private readonly swaps: ShiftSwapService,
  ) {
    const now = new Date();
    this.schedules
      .get(now.getFullYear(), now.getMonth() + 1)
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.finishLoad()),
      )
      .subscribe((schedule) => this.schedule.set(schedule));

    if (this.auth.isManager()) {
      this.pendingLoads += 2;
      this.timeOff
        .list(1, 20, 'PENDING')
        .pipe(finalize(() => this.finishLoad()))
        .subscribe({
          next: (page) => {
            this.pendingTimeOff.set(page.items);
            this.pendingTimeOffTotal.set(page.totalItems);
          },
          error: () => undefined,
        });
      this.swaps
        .list(1, 10)
        .pipe(finalize(() => this.finishLoad()))
        .subscribe({ next: (page) => this.recentSwaps.set(page.items), error: () => undefined });
    } else {
      this.pendingLoads += 1;
      const next = moveMonth(now.getFullYear(), now.getMonth() + 1, 1);
      this.schedules
        .get(next.year, next.month)
        .pipe(
          catchError(() => EMPTY),
          finalize(() => this.finishLoad()),
        )
        .subscribe((schedule) => this.nextSchedule.set(schedule));
    }
    if (this.notifications.items().length === 0) this.notifications.load();
  }

  schedulePath(): readonly (string | number)[] {
    const now = new Date();
    return ['/schedule', now.getFullYear(), now.getMonth() + 1];
  }

  initials(name?: string): string {
    return (name ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  private finishLoad(): void {
    this.pendingLoads -= 1;
    if (this.pendingLoads <= 0) this.loading.set(false);
  }
}
