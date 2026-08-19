import { Component, input } from '@angular/core';

export type IconName =
  | 'alert'
  | 'arrow-left'
  | 'arrow-right'
  | 'bell'
  | 'calendar'
  | 'calendar-off'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'clock'
  | 'home'
  | 'info'
  | 'plus'
  | 'shield-check'
  | 'sparkles'
  | 'swap'
  | 'user'
  | 'users'
  | 'x';

@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('alert') {
          <path
            d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"
          />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        }
        @case ('arrow-left') {
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        }
        @case ('arrow-right') {
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        }
        @case ('bell') {
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        }
        @case ('calendar') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        }
        @case ('calendar-off') {
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="m9 14 6 4M15 14l-6 4" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 6" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('chevron-up') {
          <path d="m18 15-6-6-6 6" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        }
        @case ('home') {
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v11h14V10M9 21v-6h6v6" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('shield-check') {
          <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        }
        @case ('sparkles') {
          <path d="m12 3-1.2 3.3L7.5 7.5l3.3 1.2L12 12l1.2-3.3 3.3-1.2-3.3-1.2Z" />
          <path
            d="m18.5 13-.8 2.2-2.2.8 2.2.8.8 2.2.8-2.2 2.2-.8-2.2-.8ZM5.5 14l-.7 1.8-1.8.7 1.8.7.7 1.8.7-1.8 1.8-.7-1.8-.7Z"
          />
        }
        @case ('swap') {
          <path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21a7 7 0 0 1 14 0M16 4.5a4 4 0 0 1 0 7.5M17 15a6 6 0 0 1 5 6" />
        }
        @case ('x') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.25em;
      height: 1.25em;
      flex: 0 0 auto;
      vertical-align: -0.2em;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
