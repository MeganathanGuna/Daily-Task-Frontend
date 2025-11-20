import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeNavbarComponent } from './time-navbar.component';

describe('TimeNavbarComponent', () => {
  let component: TimeNavbarComponent;
  let fixture: ComponentFixture<TimeNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimeNavbarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
