import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhasetaskComponent } from './phasetask.component';

describe('PhasetaskComponent', () => {
  let component: PhasetaskComponent;
  let fixture: ComponentFixture<PhasetaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhasetaskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhasetaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
