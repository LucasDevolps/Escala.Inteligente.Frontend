import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Employee, PagedResponse } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { EmployeeService } from '../../core/services/employee.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDateTime } from '../../core/utils/date.utils';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const EMPTY_EMPLOYEE_PAGE: PagedResponse<Employee> = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};

@Component({
  imports: [RouterLink, LoadingComponent, PaginationComponent, StatusBadgeComponent],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Equipe</p>
        <h1>Colaboradores</h1>
        <p>Gerencie acessos, dados profissionais e disponibilidade da equipe.</p>
      </div>
      <a class="button button--primary" routerLink="/employees/new"
        ><span aria-hidden="true">＋</span> Novo colaborador</a
      >
    </header>

    <section class="toolbar card" aria-label="Resumo de colaboradores">
      <div class="toolbar__metric">
        <strong>{{ pageData().totalItems }}</strong
        ><span>colaboradores cadastrados</span>
      </div>
      <div class="toolbar__hint">
        <span aria-hidden="true">◈</span> A produtividade é visível apenas para gestores.
      </div>
    </section>

    @if (errorMessage()) {
      <div class="alert alert--danger" role="alert">
        <span aria-hidden="true">!</span><span>{{ errorMessage() }}</span
        ><button type="button" class="button button--ghost" (click)="load(pageData().page)">
          Tentar novamente
        </button>
      </div>
    }

    @if (loading()) {
      <app-loading label="Carregando colaboradores…" />
    } @else if (pageData().items.length === 0) {
      <section class="empty-state card">
        <span class="empty-state__icon" aria-hidden="true">♙</span>
        <h2>Sua equipe começa aqui</h2>
        <p>Cadastre o primeiro colaborador para preparar as escalas.</p>
        <a class="button button--primary" routerLink="/employees/new">Cadastrar colaborador</a>
      </section>
    } @else {
      <section class="card table-card">
        <div class="table-scroll">
          <table class="data-table">
            <caption class="sr-only">
              Lista de colaboradores
            </caption>
            <thead>
              <tr>
                <th scope="col">Colaborador</th>
                <th scope="col">Matrícula</th>
                <th scope="col">Produtividade</th>
                <th scope="col">Status</th>
                <th scope="col">Cadastro</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (employee of pageData().items; track employee.id) {
                <tr>
                  <td data-label="Colaborador">
                    <div class="person-cell">
                      <span class="person-cell__avatar" aria-hidden="true">{{
                        initials(employee.name)
                      }}</span>
                      <div>
                        <strong>{{ employee.name }}</strong
                        ><span>{{ employee.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Matrícula">
                    <span class="mono">{{ employee.employeeNumber }}</span>
                  </td>
                  <td data-label="Produtividade">
                    <span class="productivity"
                      ><span
                        class="productivity__bars productivity__bars--{{
                          employee.productivityLevel
                        }}"
                        aria-hidden="true"
                        ><i></i><i></i><i></i></span
                      >{{ productivityLabel(employee.productivityLevel) }}</span
                    >
                  </td>
                  <td data-label="Status">
                    <app-status-badge [status]="employee.isActive ? 'ACTIVE' : 'INACTIVE'" />
                  </td>
                  <td data-label="Cadastro">{{ formatDateTime(employee.createdAt) }}</td>
                  <td class="data-table__actions">
                    <a
                      class="button button--ghost button--small"
                      [routerLink]="['/employees', employee.id]"
                      [attr.aria-label]="'Editar ' + employee.name"
                      >Editar</a
                    >
                    @if (employee.isActive) {
                      <button
                        type="button"
                        class="button button--danger-ghost button--small"
                        (click)="deactivate(employee)"
                      >
                        Desativar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <app-pagination
        [page]="pageData().page"
        [totalPages]="pageData().totalPages"
        (change)="load($event)"
      />
    }
  `,
})
export class EmployeesPage {
  readonly pageData = signal<PagedResponse<Employee>>(EMPTY_EMPLOYEE_PAGE);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly formatDateTime = formatDateTime;

  constructor(
    private readonly employees: EmployeeService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
  ) {
    this.load();
  }

  load(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.employees
      .list(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.pageData.set(response),
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }

  deactivate(employee: Employee): void {
    if (
      !window.confirm(
        `Desativar ${employee.name}? O colaborador não poderá mais acessar o sistema nem entrar em novas escalas.`,
      )
    )
      return;
    this.employees.deactivate(employee.id).subscribe({
      next: () => {
        this.toasts.show('Colaborador desativado.', 'success');
        this.load(this.pageData().page);
      },
      error: (error: unknown) => this.toasts.show(this.errors.message(error), 'error'),
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  productivityLabel(level: number): string {
    return (
      ['Pouco produtivo', 'Razoavelmente produtivo', 'Totalmente produtivo'][level] ??
      'Não informado'
    );
  }
}
