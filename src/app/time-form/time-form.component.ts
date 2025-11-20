import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService, TimeAllocation } from 'src/app/task.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-time-form',
  templateUrl: './time-form.component.html',
  styleUrls: ['./time-form.component.css'],
})
export class TimeFormComponent implements OnInit {
  timeForm: FormGroup;
  userName: string = '';
  isEditMode = false;
  allocationId?: number;

  constructor(
    private fb: FormBuilder,
    private service: TaskService,
    private router: Router
  ) {
    this.timeForm = this.fb.group({
      projectName: ['', Validators.required],
      taskName: ['', Validators.required],
      date: ['', Validators.required],
      hours: [null, [Validators.required, Validators.min(0.1), Validators.max(24)]],
    });
  }

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';

    const allocation = history.state.allocation;
    if (allocation) {
      this.isEditMode = true;
      this.allocationId = allocation.id;

      this.timeForm.patchValue({
        projectName: allocation.projectName,
        taskName: allocation.taskName,
        date: this.getDateWithHours(allocation),
        hours: this.getHoursForDate(allocation)
      });
    }
  }

  getDateWithHours(allocation: any): string {
    if (allocation.todayHours > 0) return this.getFormattedDate(0);
    if (allocation.yesterdayHours > 0) return this.getFormattedDate(-1);
    if (allocation.tomorrowHours > 0) return this.getFormattedDate(1);
    return this.getFormattedDate(0);
  }

  getHoursForDate(allocation: any): number {
    if (allocation.todayHours > 0) return allocation.todayHours;
    if (allocation.yesterdayHours > 0) return allocation.yesterdayHours;
    if (allocation.tomorrowHours > 0) return allocation.tomorrowHours;
    return 0;
  }

  getFormattedDate(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.timeForm.invalid) {
      this.timeForm.markAllAsTouched();
      return;
    }

    const formValue = this.timeForm.value;

    const allocation: TimeAllocation = {
      id: this.allocationId,
      projectName: formValue.projectName,
      taskName: formValue.taskName,
      date: formValue.date,
      hours: formValue.hours,
      createdBy: this.userName  // 👈 Add the logged-in user
    };

    if (this.isEditMode && this.allocationId) {
      this.service.updateTimeAllocation(allocation).subscribe(() => {
        alert('Time allocation updated successfully!');
        this.router.navigate(['/all-time']);
      });
    } else {
      this.service.addTimeAllocation(allocation).subscribe(() => {
        alert('Time allocation added successfully!');
        this.router.navigate(['/all-time']);
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/all-time']);
  }
}
