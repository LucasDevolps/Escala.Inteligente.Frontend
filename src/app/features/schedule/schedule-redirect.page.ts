import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  imports: [LoadingComponent],
  template: `<app-loading label="Abrindo a escala atual…" />`,
})
export class ScheduleRedirectPage {
  constructor(router: Router) {
    const now = new Date();
    void router.navigate(['/schedule', now.getFullYear(), now.getMonth() + 1], {
      replaceUrl: true,
    });
  }
}
