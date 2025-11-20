import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PhaseTask, TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-phasetask',
  templateUrl: './phasetask.component.html',
  styleUrls: ['./phasetask.component.css']
})
export class PhasetaskComponent implements OnInit {
  projectName: string | null = null;
  taskId: number | null = null;
  allUsers: { name: string }[] = [];

  task: PhaseTask = {
    assignedDate: '',
    taskName: '',
    status: 'Open',
    assignedTo: '',
    remarks: ''
  };

  isEditMode = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: TaskService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.projectName = params['projectName'] || null;
      this.taskId = params['taskId'] ? +params['taskId'] : null;

      this.service.getAllUsers().subscribe((data: any[]) => {
        this.allUsers = data;
      });

      if (this.taskId) {
        this.isEditMode = true;
        this.service.getPhaseTaskById(this.taskId).subscribe(task => {
          this.task = { ...task };
        });
      }
    });
  }

  saveTask() {
    if (!this.projectName) {
      alert('Project name is missing');
      return;
    }

    this.task.projectName = this.projectName;

    if (this.isEditMode && this.taskId) {
      this.task.id = this.taskId;
      this.service.updatePhaseTask(this.taskId, this.task).subscribe(() => {
        alert('✅ Task updated successfully!');
        this.router.navigate(['/specialization']); // 👈 Redirect back to Project page
      });
    } else {
      this.service.createPhaseTask(this.task).subscribe(() => {
        alert('✅ Task created successfully!');
        this.router.navigate(['/project']); // 👈 Redirect back to Project page
      });
    }
  }

  cancel() {
    this.router.navigate(['/specialization']);
  }
}
