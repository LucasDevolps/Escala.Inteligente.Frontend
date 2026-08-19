import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  it('uses the browser DOCUMENT injection token without creating a DI cycle', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    expect(TestBed.inject(ActivityService)).toBeTruthy();
  });
});
