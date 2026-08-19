import { Component, computed, effect, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, finalize } from 'rxjs';
import {
  Employee,
  Schedule,
  ScheduleAssignment,
  ShiftSwap,
  TimeOffRequest,
} from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { ShiftSwapService } from '../../core/services/shift-swap.service';
import { TimeOffService } from '../../core/services/time-off.service';
import { ToastService } from '../../core/services/toast.service';
import {
  buildCalendar,
  CalendarCell,
  formatDate,
  monthTitle,
  moveMonth,
} from '../../core/utils/date.utils';
import { IconComponent } from '../../shared/components/icon.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  imports: [IconComponent, LoadingComponent, StatusBadgeComponent],
  template: `
    <header class="page-header schedule-header">
      <div>
        <p class="eyebrow">Planejamento mensal</p>
        <h1>{{ auth.isManager() ? 'Escala da equipe' : 'Minha escala' }}</h1>
        <p>
          {{
            auth.isManager()
              ? 'O motor sugere; você revisa, ajusta e publica.'
              : 'Consulte os dias publicados e acompanhe suas solicitações.'
          }}
        </p>
      </div>
      @if (schedule(); as current) {
        <div class="schedule-meta">
          <app-status-badge [status]="current.status" /><span>Revisão {{ current.revision }}</span>
        </div>
      }
    </header>

    <section class="month-toolbar card" aria-label="Navegação entre meses">
      <button
        type="button"
        class="icon-button icon-button--bordered"
        (click)="navigateMonth(-1)"
        aria-label="Mês anterior"
      >
        <app-icon name="arrow-left" />
      </button>
      <div>
        <small>Mês selecionado</small>
        <h2>{{ title() }}</h2>
      </div>
      <button
        type="button"
        class="icon-button icon-button--bordered"
        (click)="navigateMonth(1)"
        aria-label="Próximo mês"
      >
        <app-icon name="arrow-right" />
      </button>
      @if (auth.isManager() && schedule(); as current) {
        <div class="month-toolbar__actions">
          @if (current.status !== 'PUBLISHED' && current.status !== 'CLOSED') {
            <button
              type="button"
              class="button button--secondary"
              (click)="generate()"
              [disabled]="actionLoading()"
            >
              <app-icon name="sparkles" /> Gerar sugestão
            </button>
            <button
              type="button"
              class="button button--primary"
              (click)="publish()"
              [disabled]="actionLoading() || current.assignments.length === 0"
            >
              <app-icon name="check" /> Publicar escala
            </button>
          }
        </div>
      }
    </section>

    @if (errorMessage() && !notFound()) {
      <div class="alert alert--danger" role="alert">
        <span aria-hidden="true"><app-icon name="alert" /></span><span>{{ errorMessage() }}</span
        ><button type="button" class="button button--ghost" (click)="reload()">
          Tentar novamente
        </button>
      </div>
    }

    @if (loading()) {
      <app-loading label="Montando o calendário…" />
    } @else if (notFound()) {
      <section class="empty-state card">
        <span class="empty-state__icon" aria-hidden="true"><app-icon name="calendar" /></span>
        <h2>
          {{ auth.isManager() ? 'Comece a escala deste mês' : 'Escala ainda não disponível' }}
        </h2>
        <p>
          {{
            auth.isManager()
              ? 'Crie um rascunho para montar manualmente ou gerar uma sugestão determinística.'
              : 'A escala aparecerá assim que o gestor publicá-la.'
          }}
        </p>
        @if (auth.isManager()) {
          <button
            type="button"
            class="button button--primary"
            (click)="createSchedule()"
            [disabled]="actionLoading()"
          >
            Criar rascunho
          </button>
        }
      </section>
    } @else if (schedule(); as current) {
      @if (current.warnings.length > 0) {
        <details class="coverage-summary card">
          <summary>
            <span class="coverage-summary__icon" aria-hidden="true"><app-icon name="alert" /></span
            ><strong
              >{{ current.warnings.length }}
              {{ current.warnings.length === 1 ? 'alerta precisa' : 'alertas precisam' }} de
              atenção</strong
            ><span>Ver detalhes</span>
          </summary>
          <ul>
            @for (warning of current.warnings; track $index) {
              <li>
                <strong>{{ warning.date ? formatDate(warning.date) : 'Escala' }}:</strong>
                {{ warning.message }}
              </li>
            }
          </ul>
        </details>
      }

      <section class="calendar-card card" aria-labelledby="calendar-title">
        <div class="calendar-card__header">
          <div>
            <p class="eyebrow">Calendário</p>
            <h2 id="calendar-title">{{ title() }}</h2>
          </div>
          <div class="calendar-legend" aria-label="Legenda">
            <span><i class="legend-dot legend-dot--work"></i> Trabalho</span
            ><span><i class="legend-dot legend-dot--off"></i> Folga</span
            ><span><i class="legend-dot legend-dot--pending"></i> Pendente</span
            ><span><i class="legend-dot legend-dot--alert"></i> Alerta</span
            ><span><i class="legend-dot legend-dot--swap"></i> Troca</span>
          </div>
        </div>
        <div class="weekday-row" aria-hidden="true">
          <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span
          ><span>Sex</span><span>Sáb</span>
        </div>
        <div class="calendar-grid" role="grid" [attr.aria-label]="'Escala de ' + title()">
          @for (cell of calendar(); track cell.isoDate ?? $index) {
            @if (cell.isoDate) {
              <article
                class="calendar-day"
                [class.calendar-day--today]="cell.isToday"
                [class.calendar-day--editable]="canEdit()"
                role="gridcell"
                [attr.tabindex]="canEdit() ? 0 : null"
                [attr.aria-label]="dayAriaLabel(cell)"
                (click)="openDay(cell.isoDate)"
                (keydown.enter)="openDay(cell.isoDate)"
                (keydown.space)="openDayKeyboard(cell.isoDate, $event)"
              >
                <header>
                  <span class="calendar-day__weekday">{{ cell.weekday }}</span
                  ><strong>{{ cell.day }}</strong>
                  @if (cell.isToday) {
                    <small>Hoje</small>
                  }
                </header>
                <div class="calendar-day__content">
                  @for (
                    assignment of visibleAssignments(cell.isoDate);
                    track assignment.employeeId
                  ) {
                    <div
                      class="assignment-chip"
                      [class.assignment-chip--mine]="
                        assignment.employeeId === auth.user()?.employeeId
                      "
                    >
                      <span aria-hidden="true">●</span
                      ><span>{{ auth.isManager() ? assignment.employeeName : 'Trabalho' }}</span>
                      @if (assignment.source === 'SWAP') {
                        <small><app-icon name="swap" /> troca</small>
                      }
                    </div>
                    @if ((assignment.reasons?.length ?? 0) > 0) {
                      <details class="assignment-reasons" (click)="$event.stopPropagation()">
                        <summary>Por que esta sugestão?</summary>
                        <ul>
                          @for (reason of assignment.reasons; track $index) {
                            <li>{{ reason }}</li>
                          }
                        </ul>
                      </details>
                    }
                  }
                  @for (request of requestsFor(cell.isoDate); track request.id) {
                    <div
                      class="day-indicator day-indicator--{{
                        request.status === 'APPROVED' ? 'off' : 'pending'
                      }}"
                    >
                      @if (request.status === 'APPROVED') {
                        <app-icon name="calendar-off" />
                      } @else {
                        <app-icon name="clock" />
                      }
                      {{
                        auth.isManager() && request.employeeName ? request.employeeName + ': ' : ''
                      }}{{ request.status === 'APPROVED' ? 'Folga' : 'Folga pendente' }}
                    </div>
                  }
                  @if (hasSwap(cell.isoDate)) {
                    <div class="day-indicator day-indicator--swap">
                      <app-icon name="swap" /> Troca
                    </div>
                  }
                  @if (hasWarning(cell.isoDate)) {
                    <div class="day-indicator day-indicator--alert">
                      <app-icon name="alert" /> Alerta
                    </div>
                  }
                  @if (canEdit() && visibleAssignments(cell.isoDate).length === 0) {
                    <span class="calendar-day__add"><app-icon name="plus" /> Adicionar</span>
                  }
                </div>
              </article>
            } @else {
              <span class="calendar-day calendar-day--empty" aria-hidden="true"></span>
            }
          }
        </div>
      </section>
      <p class="schedule-footnote">
        <span aria-hidden="true"><app-icon name="shield-check" /></span> Alterações manuais são
        auditadas. Escalas sugeridas nunca são publicadas automaticamente.
      </p>
    }

    @if (selectedDate(); as date) {
      <div class="modal-backdrop" role="presentation" (click)="closeEditor()">
        <section
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-editor-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal-panel__header">
            <div>
              <p class="eyebrow">Edição manual</p>
              <h2 id="day-editor-title">{{ formatDate(date) }}</h2>
              <p>Selecione quem trabalhará neste dia.</p>
            </div>
            <button type="button" class="icon-button" (click)="closeEditor()" aria-label="Fechar">
              <app-icon name="x" />
            </button>
          </header>
          <div class="employee-checklist">
            @for (employee of activeEmployees(); track employee.id) {
              <label class="check-card"
                ><input
                  type="checkbox"
                  [checked]="selectedEmployees().has(employee.id)"
                  (change)="toggleEmployee(employee.id)" /><span
                  class="person-cell__avatar"
                  aria-hidden="true"
                  >{{ initials(employee.name) }}</span
                ><span
                  ><strong>{{ employee.name }}</strong
                  ><small>Matrícula {{ employee.employeeNumber }}</small></span
                ><span class="custom-check" aria-hidden="true"><app-icon name="check" /></span
              ></label>
            } @empty {
              <div class="compact-empty">
                <span aria-hidden="true"><app-icon name="users" /></span>
                <p>Nenhum colaborador ativo disponível.</p>
              </div>
            }
          </div>
          <footer class="modal-panel__footer">
            <button type="button" class="button button--ghost" (click)="closeEditor()">
              Cancelar</button
            ><button
              type="button"
              class="button button--primary"
              (click)="saveDay()"
              [disabled]="actionLoading()"
            >
              Salvar dia
            </button>
          </footer>
        </section>
      </div>
    }
  `,
  styleUrl: './schedule.page.scss',
})
export class SchedulePage {
  readonly year = input.required<string>();
  readonly month = input.required<string>();
  readonly schedule = signal<Schedule | null>(null);
  readonly employees = signal<readonly Employee[]>([]);
  readonly timeOffRequests = signal<readonly TimeOffRequest[]>([]);
  readonly swaps = signal<readonly ShiftSwap[]>([]);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly notFound = signal(false);
  readonly errorMessage = signal('');
  readonly selectedDate = signal<string | null>(null);
  readonly selectedEmployees = signal<ReadonlySet<string>>(new Set());
  readonly parsedYear = computed(() => Number(this.year()));
  readonly parsedMonth = computed(() => Number(this.month()));
  readonly title = computed(() => monthTitle(this.parsedYear(), this.parsedMonth()));
  readonly calendar = computed<readonly CalendarCell[]>(() =>
    buildCalendar(this.parsedYear(), this.parsedMonth()),
  );
  readonly activeEmployees = computed(() =>
    this.employees().filter((employee) => employee.isActive),
  );
  readonly canEdit = computed(
    () =>
      this.auth.isManager() &&
      !!this.schedule() &&
      !['PUBLISHED', 'CLOSED'].includes(this.schedule()?.status ?? ''),
  );

  constructor(
    readonly auth: AuthService,
    private readonly schedules: ScheduleService,
    private readonly employeeService: EmployeeService,
    private readonly timeOff: TimeOffService,
    private readonly shiftSwaps: ShiftSwapService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
    private readonly router: Router,
  ) {
    effect((onCleanup) => {
      const year = this.parsedYear();
      const month = this.parsedMonth();
      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        year < 2000 ||
        year > 2200
      ) {
        const now = new Date();
        void this.router.navigate(['/schedule', now.getFullYear(), now.getMonth() + 1], {
          replaceUrl: true,
        });
        return;
      }
      const subscription = this.fetchSchedule(year, month);
      onCleanup(() => subscription.unsubscribe());
    });

    if (this.auth.isManager()) {
      this.employeeService.listAll().subscribe({
        next: (employees) => this.employees.set(employees),
        error: (error: unknown) => this.toasts.show(this.errors.message(error), 'error'),
      });
    }
    this.loadIndicators();
  }

  reload(): void {
    this.fetchSchedule(this.parsedYear(), this.parsedMonth());
  }

  navigateMonth(delta: number): void {
    const destination = moveMonth(this.parsedYear(), this.parsedMonth(), delta);
    void this.router.navigate(['/schedule', destination.year, destination.month]);
  }

  createSchedule(): void {
    this.actionLoading.set(true);
    this.schedules
      .create(this.parsedYear(), this.parsedMonth())
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (schedule) => {
          this.schedule.set(schedule);
          this.notFound.set(false);
          this.toasts.show('Rascunho criado.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errors.message(error), 'error');
          if (this.errors.code(error) === 'SCHEDULE_ALREADY_EXISTS') this.reload();
        },
      });
  }

  generate(): void {
    const current = this.schedule();
    if (!current) return;
    if (
      current.assignments.length > 0 &&
      !window.confirm('Gerar novamente substituirá a sugestão atual. Deseja continuar?')
    )
      return;
    this.actionLoading.set(true);
    this.schedules
      .generate(current.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (schedule) => {
          this.schedule.set(schedule);
          this.toasts.show('Sugestão gerada. Revise antes de publicar.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errors.message(error), 'error');
          if (this.errors.code(error) === 'SCHEDULE_ALREADY_PUBLISHED') this.reload();
        },
      });
  }

  publish(): void {
    const current = this.schedule();
    if (
      !current ||
      !window.confirm(
        'Publicar esta escala para todos os colaboradores? Esta ação é explícita e ficará registrada na auditoria.',
      )
    )
      return;
    this.actionLoading.set(true);
    this.schedules
      .publish(current.id, current.rowVersion)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (schedule) => {
          this.schedule.set(schedule);
          this.toasts.show('Escala publicada para a equipe.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errors.message(error), 'error');
          if (
            ['CONCURRENCY_CONFLICT', 'SCHEDULE_ALREADY_PUBLISHED'].includes(
              this.errors.code(error) ?? '',
            )
          )
            this.reload();
        },
      });
  }

  openDay(date: string): void {
    if (!this.canEdit()) return;
    this.selectedEmployees.set(
      new Set(this.assignmentsFor(date).map((assignment) => assignment.employeeId)),
    );
    this.selectedDate.set(date);
  }

  openDayKeyboard(date: string, event: Event): void {
    event.preventDefault();
    this.openDay(date);
  }

  closeEditor(): void {
    this.selectedDate.set(null);
    this.selectedEmployees.set(new Set());
  }

  toggleEmployee(employeeId: string): void {
    const selected = new Set(this.selectedEmployees());
    selected.has(employeeId) ? selected.delete(employeeId) : selected.add(employeeId);
    this.selectedEmployees.set(selected);
  }

  saveDay(): void {
    const current = this.schedule();
    const date = this.selectedDate();
    if (!current || !date) return;
    this.actionLoading.set(true);
    this.schedules
      .updateDay(current.id, date, [...this.selectedEmployees()], current.rowVersion)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.schedule.set(response);
          this.closeEditor();
          this.toasts.show('Dia atualizado.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errors.message(error), 'error');
          if (
            ['CONCURRENCY_CONFLICT', 'SCHEDULE_ALREADY_PUBLISHED'].includes(
              this.errors.code(error) ?? '',
            )
          ) {
            this.closeEditor();
            this.reload();
          }
        },
      });
  }

  assignmentsFor(date: string): readonly ScheduleAssignment[] {
    return this.schedule()?.assignments.filter((assignment) => assignment.workDate === date) ?? [];
  }

  visibleAssignments(date: string): readonly ScheduleAssignment[] {
    const assignments = this.assignmentsFor(date);
    return this.auth.isManager()
      ? assignments
      : assignments.filter((assignment) => assignment.employeeId === this.auth.user()?.employeeId);
  }

  requestsFor(date: string): readonly TimeOffRequest[] {
    return this.timeOffRequests().filter(
      (request) => request.date === date && ['PENDING', 'APPROVED'].includes(request.status),
    );
  }

  hasWarning(date: string): boolean {
    return this.schedule()?.warnings.some((warning) => warning.date === date) ?? false;
  }

  hasSwap(date: string): boolean {
    return this.swaps().some(
      (swap) => swap.date === date && ['PENDING', 'ACCEPTED'].includes(swap.status),
    );
  }

  dayAriaLabel(cell: CalendarCell): string {
    if (!cell.isoDate) return '';
    const states = [
      `${cell.day} de ${this.title()}`,
      ...this.visibleAssignments(cell.isoDate).map((assignment) =>
        this.auth.isManager() ? `${assignment.employeeName} trabalha` : 'Dia de trabalho',
      ),
      ...this.requestsFor(cell.isoDate).map((request) =>
        request.status === 'APPROVED' ? 'Folga aprovada' : 'Folga pendente',
      ),
      ...(this.hasSwap(cell.isoDate) ? ['Possui troca'] : []),
      ...(this.hasWarning(cell.isoDate) ? ['Possui alerta'] : []),
    ];
    return states.join('. ');
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  readonly formatDate = formatDate;

  private fetchSchedule(year: number, month: number) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.notFound.set(false);
    return this.schedules
      .get(year, month)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (schedule) => this.schedule.set(schedule),
        error: (error: unknown) => {
          if (this.errors.code(error) === 'SCHEDULE_NOT_FOUND') {
            this.schedule.set(null);
            this.notFound.set(true);
          } else {
            this.errorMessage.set(this.errors.message(error));
          }
        },
      });
  }

  private loadIndicators(): void {
    this.timeOff
      .listAll()
      .pipe(catchError(() => EMPTY))
      .subscribe((requests) => this.timeOffRequests.set(requests));
    this.shiftSwaps
      .listAll()
      .pipe(catchError(() => EMPTY))
      .subscribe((swaps) => this.swaps.set(swaps));
  }
}
