import { Component, computed, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Employee, EmployeeUpsertRequest, ProductivityLevel } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { EmployeeService } from '../../core/services/employee.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { LoadingComponent } from '../../shared/components/loading.component';

const normalizedPhoneLength: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const normalized = String(control.value ?? '').replace(/[^+\d]/g, '');
  return normalized.length >= 1 && normalized.length <= 20 ? null : { phoneLength: true };
};

const trimmedLength =
  (minimum: number, maximum: number): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    return length >= minimum && length <= maximum ? null : { trimmedLength: true };
  };

@Component({
  imports: [ReactiveFormsModule, RouterLink, IconComponent, LoadingComponent],
  template: `
    <header class="page-header">
      <div>
        <a class="back-link" routerLink="/employees"
          ><app-icon name="arrow-left" /> Voltar para colaboradores</a
        >
        <p class="eyebrow">Equipe</p>
        <h1>{{ isEdit() ? 'Editar colaborador' : 'Novo colaborador' }}</h1>
        <p>
          {{
            isEdit()
              ? 'Mantenha os dados profissionais atualizados.'
              : 'Cadastre os dados e compartilhe o código de ativação com segurança.'
          }}
        </p>
      </div>
    </header>

    @if (loading()) {
      <app-loading />
    } @else if (activationCode()) {
      <section class="activation-code-card card" aria-labelledby="activation-title">
        <span class="success-seal" aria-hidden="true"><app-icon name="check" /></span>
        <p class="eyebrow">Cadastro concluído</p>
        <h2 id="activation-title">Código de ativação gerado</h2>
        <p>
          Este código será exibido somente agora. Compartilhe-o com
          <strong>{{ createdEmployeeName() }}</strong> por um canal externo seguro.
        </p>
        <div class="activation-code" aria-label="Código de ativação">
          <code>{{ activationCode() }}</code
          ><button type="button" class="button button--secondary" (click)="copyCode()">
            Copiar código
          </button>
        </div>
        <div class="alert alert--warning">
          <span aria-hidden="true"><app-icon name="alert" /></span
          ><span
            >O código expira em 24 horas. O colaborador definirá a própria senha e o gestor nunca
            terá acesso a ela.</span
          >
        </div>
        <a class="button button--primary" routerLink="/employees">Concluir</a>
      </section>
    } @else {
      <form class="form-card card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (errorMessage()) {
          <div class="alert alert--danger" role="alert">
            <span aria-hidden="true"><app-icon name="alert" /></span
            ><span>{{ errorMessage() }}</span>
          </div>
        }
        <section class="form-section" aria-labelledby="personal-data-title">
          <div class="form-section__intro">
            <span class="form-section__number" aria-hidden="true">01</span>
            <div>
              <h2 id="personal-data-title">Dados pessoais</h2>
              <p>Use apenas as informações necessárias para contato e identificação.</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="field field--wide">
              <label for="name">Nome completo</label
              ><input id="name" formControlName="name" autocomplete="name" maxlength="150" />
              @if (invalid('name')) {
                <small class="field-error">Informe entre 2 e 150 caracteres.</small>
              }
            </div>
            <div class="field">
              <label for="email">E-mail</label
              ><input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
                maxlength="320"
              />
              @if (invalid('email')) {
                <small class="field-error">Informe um e-mail válido.</small>
              }
            </div>
            <div class="field">
              <label for="phone">Telefone</label
              ><input
                id="phone"
                type="tel"
                formControlName="phone"
                autocomplete="tel"
                placeholder="(00) 00000-0000"
              />
              @if (invalid('phone')) {
                <small class="field-error"
                  >Informe um telefone com até 20 caracteres após normalização.</small
                >
              }
            </div>
          </div>
        </section>

        <section class="form-section" aria-labelledby="professional-data-title">
          <div class="form-section__intro">
            <span class="form-section__number" aria-hidden="true">02</span>
            <div>
              <h2 id="professional-data-title">Dados profissionais</h2>
              <p>
                A produtividade influencia pouco a sugestão e nunca é usada como único critério.
              </p>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="employee-number">Matrícula</label
              ><input id="employee-number" formControlName="employeeNumber" maxlength="50" />
              @if (invalid('employeeNumber')) {
                <small class="field-error">Informe uma matrícula com até 50 caracteres.</small>
              }
            </div>
            <div class="field">
              <label for="productivity">Nível de produtividade</label
              ><select id="productivity" formControlName="productivityLevel">
                <option [ngValue]="0">Pouco produtivo</option>
                <option [ngValue]="1">Razoavelmente produtivo</option>
                <option [ngValue]="2">Totalmente produtivo</option></select
              ><small class="field-help">Visível somente para gestores.</small>
            </div>
          </div>
        </section>

        <footer class="form-actions">
          <a class="button button--ghost" routerLink="/employees">Cancelar</a
          ><button class="button button--primary" type="submit" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner spinner--light" aria-hidden="true"></span> Salvando…
            } @else {
              {{ isEdit() ? 'Salvar alterações' : 'Cadastrar colaborador' }}
            }
          </button>
        </footer>
      </form>
    }
  `,
})
export class EmployeeFormPage {
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedLength(2, 150)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, normalizedPhoneLength],
    }),
    employeeNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedLength(1, 50)],
    }),
    productivityLevel: new FormControl<ProductivityLevel>(1, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly employee = signal<Employee | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly activationCode = signal('');
  readonly createdEmployeeName = signal('');
  readonly id: string | null;
  readonly isEdit = computed(() => this.id !== null);

  constructor(
    route: ActivatedRoute,
    private readonly employees: EmployeeService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
    private readonly router: Router,
  ) {
    this.id = route.snapshot.paramMap.get('id');
    if (this.id) this.load(this.id);
  }

  invalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    const value = this.form.getRawValue();
    const request: EmployeeUpsertRequest = {
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      employeeNumber: value.employeeNumber.trim(),
      productivityLevel: value.productivityLevel,
      ...(this.employee()?.rowVersion ? { rowVersion: this.employee()?.rowVersion } : {}),
    };
    if (this.id) {
      this.employees
        .update(this.id, request)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.toasts.show('Dados do colaborador atualizados.', 'success');
            void this.router.navigate(['/employees']);
          },
          error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
        });
      return;
    }

    this.employees
      .create(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.activationCode.set(response.activationCode);
          this.createdEmployeeName.set(response.employee.name);
        },
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.activationCode());
      this.toasts.show('Código copiado.', 'success');
    } catch {
      this.toasts.show(
        'Não foi possível copiar automaticamente. Selecione o código e copie.',
        'warning',
      );
    }
  }

  private load(id: string): void {
    this.loading.set(true);
    this.employees
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (employee) => {
          this.employee.set(employee);
          this.form.patchValue({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            employeeNumber: employee.employeeNumber,
            productivityLevel: employee.productivityLevel,
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }
}
