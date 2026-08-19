import { Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationStore } from '../core/services/notification.store';
import { RealtimeService } from '../core/services/realtime.service';

interface NavigationItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly managerOnly?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-frame">
      <header class="topbar">
        <a routerLink="/dashboard" class="brand" aria-label="Escala Certa — início">
          <span class="brand__mark" aria-hidden="true">EC</span>
          <span class="brand__name">Escala Certa</span>
        </a>

        <div class="topbar__actions">
          <span
            class="connection-dot connection-dot--{{ realtime.state() }}"
            [attr.aria-label]="connectionLabel"
          ></span>
          <a
            class="notification-button"
            routerLink="/notifications"
            routerLinkActive="notification-button--active"
            ariaCurrentWhenActive="page"
            aria-label="Notificações"
          >
            <span aria-hidden="true">◇</span>
            @if (notifications.unreadCount() > 0) {
              <span class="notification-button__badge">{{
                notifications.unreadCount() > 99 ? '99+' : notifications.unreadCount()
              }}</span>
            }
          </a>
          <button
            type="button"
            class="avatar-button"
            (click)="profileOpen.set(!profileOpen())"
            [attr.aria-expanded]="profileOpen()"
            aria-controls="profile-menu"
          >
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="avatar-button__text"
              ><strong>{{ auth.user()?.name }}</strong
              ><small>{{ roleLabel() }}</small></span
            >
            <span aria-hidden="true">⌄</span>
          </button>
          @if (profileOpen()) {
            <div id="profile-menu" class="profile-menu">
              <p>
                <strong>{{ auth.user()?.name }}</strong
                ><br /><span>{{ roleLabel() }}</span>
              </p>
              <button type="button" class="button button--ghost button--full" (click)="logout()">
                Sair
              </button>
            </div>
          }
        </div>
      </header>

      <aside class="sidebar" aria-label="Navegação principal">
        <nav>
          @for (item of visibleItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="nav-link--active"
              ariaCurrentWhenActive="page"
              class="nav-link"
            >
              <span aria-hidden="true" class="nav-link__icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="sidebar__footer">
          <span class="privacy-mark" aria-hidden="true">◈</span>
          <span>Dados protegidos<br /><small>Privacidade por padrão</small></span>
        </div>
      </aside>

      <main id="main-content" class="main-content" tabindex="-1">
        <router-outlet />
      </main>

      <nav class="bottom-nav" aria-label="Navegação móvel">
        @for (item of mobileItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bottom-nav__link--active"
            ariaCurrentWhenActive="page"
            class="bottom-nav__link"
          >
            <span aria-hidden="true">{{ item.icon }}</span>
            <small>{{ item.label }}</small>
          </a>
        }
      </nav>
    </div>
  `,
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly profileOpen = signal(false);
  private readonly items: readonly NavigationItem[] = [
    { label: 'Visão geral', icon: '⌂', path: '/dashboard' },
    { label: 'Escala', icon: '▦', path: '/schedule' },
    { label: 'Colaboradores', icon: '♙', path: '/employees', managerOnly: true },
    { label: 'Folgas', icon: '○', path: '/time-off' },
    { label: 'Trocas', icon: '⇄', path: '/swaps' },
    { label: 'Notificações', icon: '◇', path: '/notifications' },
  ];

  readonly visibleItems = computed(() =>
    this.items.filter((item) => !item.managerOnly || this.auth.isManager()),
  );
  readonly mobileItems = computed(() =>
    this.visibleItems()
      .filter((item) => item.path !== '/notifications')
      .slice(0, 5),
  );
  readonly initials = computed(() =>
    (this.auth.user()?.name ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
      .join(''),
  );
  readonly roleLabel = computed(() =>
    this.auth.user()?.role === 'MANAGER' ? 'Gestor' : 'Colaborador',
  );

  constructor(
    readonly auth: AuthService,
    readonly notifications: NotificationStore,
    readonly realtime: RealtimeService,
  ) {}

  get connectionLabel(): string {
    const labels: Record<string, string> = {
      connected: 'Atualizações em tempo real conectadas',
      connecting: 'Conectando atualizações em tempo real',
      disconnected: 'Atualizações em tempo real desconectadas',
    };
    return labels[this.realtime.state()] ?? '';
  }

  logout(): void {
    this.profileOpen.set(false);
    this.auth.logout().subscribe();
  }
}
