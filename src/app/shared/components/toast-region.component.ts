import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-region',
  imports: [IconComponent],
  template: `
    <section class="toast-region" aria-live="polite" aria-label="Mensagens do sistema">
      @for (toast of toasts.messages(); track toast.id) {
        <div class="toast toast--{{ toast.kind }}" role="status">
          <span>{{ toast.message }}</span>
          <button
            type="button"
            class="icon-button"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Fechar mensagem"
          >
            <app-icon name="x" />
          </button>
        </div>
      }
    </section>
  `,
})
export class ToastRegionComponent {
  constructor(readonly toasts: ToastService) {}
}
