import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/login.page').then((module) => module.LoginPage),
    title: 'Entrar | Escala Certa',
  },
  {
    path: 'activate',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/activate.page').then((module) => module.ActivatePage),
    title: 'Ativar acesso | Escala Certa',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((module) => module.DashboardPage),
        title: 'Visão geral | Escala Certa',
      },
      {
        path: 'employees',
        pathMatch: 'full',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/employees/employees.page').then((module) => module.EmployeesPage),
        title: 'Colaboradores | Escala Certa',
      },
      {
        path: 'employees/new',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/employees/employee-form.page').then(
            (module) => module.EmployeeFormPage,
          ),
        title: 'Novo colaborador | Escala Certa',
      },
      {
        path: 'employees/:id',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/employees/employee-form.page').then(
            (module) => module.EmployeeFormPage,
          ),
        title: 'Editar colaborador | Escala Certa',
      },
      {
        path: 'schedule',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/schedule/schedule-redirect.page').then(
            (module) => module.ScheduleRedirectPage,
          ),
        title: 'Escala | Escala Certa',
      },
      {
        path: 'schedule/:year/:month',
        loadComponent: () =>
          import('./features/schedule/schedule.page').then((module) => module.SchedulePage),
        title: 'Escala mensal | Escala Certa',
      },
      {
        path: 'time-off',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/time-off/time-off.page').then((module) => module.TimeOffPage),
        title: 'Solicitações de folga | Escala Certa',
      },
      {
        path: 'time-off/new',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/time-off/time-off-form.page').then((module) => module.TimeOffFormPage),
        title: 'Solicitar folga | Escala Certa',
      },
      {
        path: 'swaps',
        loadComponent: () =>
          import('./features/swaps/swaps.page').then((module) => module.SwapsPage),
        title: 'Trocas | Escala Certa',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.page').then(
            (module) => module.NotificationsPage,
          ),
        title: 'Notificações | Escala Certa',
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found.page').then((module) => module.NotFoundPage),
    title: 'Página não encontrada | Escala Certa',
  },
];
