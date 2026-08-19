import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  readonly lastActivityAt = signal(Date.now());

  constructor(@Inject(DOCUMENT) document: Document, router: Router, destroyRef: DestroyRef) {
    const mark = (): void => this.markActivity();
    const options: AddEventListenerOptions = { passive: true, capture: true };
    const events: readonly (keyof DocumentEventMap)[] = [
      'pointerdown',
      'touchstart',
      'keydown',
      'submit',
    ];

    for (const event of events) {
      document.addEventListener(event, mark, options);
    }

    const navigationSubscription = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(mark);

    destroyRef.onDestroy(() => {
      for (const event of events) {
        document.removeEventListener(event, mark, options);
      }
      navigationSubscription.unsubscribe();
    });
  }

  markActivity(): void {
    this.lastActivityAt.set(Date.now());
  }

  wasRecentlyActive(windowMs = ACTIVE_WINDOW_MS): boolean {
    return Date.now() - this.lastActivityAt() <= windowMs;
  }
}
