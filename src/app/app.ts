import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RealtimeService } from './core/services/realtime.service';
import { ToastRegionComponent } from './shared/components/toast-region.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastRegionComponent],
  template: `
    <a class="skip-link" href="#main-content">Pular para o conteúdo principal</a>
    <router-outlet />
    <app-toast-region />
  `,
})
export class App {
  constructor(_realtime: RealtimeService) {}
}
