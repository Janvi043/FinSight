import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertCard } from './alert-card';

describe('AlertCard', () => {
  let component: AlertCard;
  let fixture: ComponentFixture<AlertCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
