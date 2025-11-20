import { Component, Input, OnChanges, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService, Task, Project } from 'src/app/task.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent implements OnInit, OnChanges {
  @Input() existingData: Task | null = null;
  @Input() refresh!: () => void;
  @Input() resetEdit!: () => void;
  @Input() selectedProject: string | null = null;
  @Output() editTask = new EventEmitter<any>();
  @Output() formClosed = new EventEmitter<void>();
  @Output() taskSubmitted = new EventEmitter<void>();  // ← NEW

  taskForm: FormGroup;
  editId: number | null = null;
  userName: string = '';
  userRole: string = '';
  isPm: boolean = false;

  todayDate: string = '';

  allUsers: { name: string }[] = [];
  allProjects: Project[] = [];

  predefinedRoles = [
    'Cloud Engineer',
    'Associate Cloud Engineer',
    'Junior Cloud Engineer',
    'Solution Architect',
    'DevOps Engineer',
    'AI Engineer',
    'Junior AI Engineer',
    'Software Engineer'
  ];

  constructor(
    private fb: FormBuilder,
    private service: TaskService,
    private router: Router
  ) {
    this.taskForm = this.fb.group({
      assignedDate: [''],
      projectName: ['', Validators.required],
      projectTitle: ['', Validators.required],
      assignedTo: ['', Validators.required],
      role: ['', Validators.required],
      roleUser: ['', Validators.required],
      status: ['', Validators.required],
      remarks: [''],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
  this.userName = localStorage.getItem('userName') || '';
  this.userRole = localStorage.getItem('userRole') || '';
  this.isPm = localStorage.getItem('isPM') === 'true';

  // TODAY DATE (for new tasks only)
  this.todayDate = new Date().toISOString().split('T')[0];

  if (!this.userName || !this.userRole) {
    this.router.navigate(['/login']);
    return;
  }

  // Prefill "Created By"
  this.taskForm.patchValue({ assignedTo: this.userName });

  // Load users & projects
  this.service.getAllUsers().subscribe((data: any[]) => {
    this.allUsers = data;
  });

  this.service.getProjects().subscribe((projects: Project[]) => {
    this.allProjects = projects;
  });

  // Load from localStorage (edit mode)
  const storedTask = localStorage.getItem('editingTask');
  if (storedTask) {
    const task = JSON.parse(storedTask);
    localStorage.removeItem('editingTask');
    this.loadTaskForEdit(task);
  }
}

ngOnChanges(): void {
  if (this.selectedProject) {
    this.taskForm.patchValue({ projectName: this.selectedProject });
    this.taskForm.get('projectName')?.disable();
  }

  if (this.existingData) {
    this.loadTaskForEdit(this.existingData);
  }
}

private loadTaskForEdit(task: any): void {
  this.editId = task.id || null;
  const [role, roleUser] = (task.role || '').split(' - ');

  this.taskForm.patchValue({
    projectName: task.projectName,
    projectTitle: task.projectTitle,
    assignedTo: task.createdBy || this.userName,
    role: role?.trim(),
    roleUser: roleUser?.trim(),
    status: task.status,
    remarks: task.remarks,
    endDate: task.endDate,
    assignedDate: task.assignedDate  // THIS WAS MISSING!
  });

  this.applyEditPermissions(roleUser);
}


  
  /** ✅ Restrict fields if logged-in user is assignee */
  private applyEditPermissions(roleUser: string | undefined): void {
    const assignee = (roleUser || '').trim().toLowerCase();
    if (assignee === this.userName.toLowerCase()) {
      Object.keys(this.taskForm.controls).forEach(c => {
        if (c === 'status' || c === 'remarks') {
          this.taskForm.get(c)?.enable({ emitEvent: false });
        } else {
          this.taskForm.get(c)?.disable({ emitEvent: false });
        }
      });
    }
  }

  /** ✅ Cancel button handling */
  onCancel(): void {
  this.formClosed.emit();  // ← Close popup on cancel
}

  /** ✅ Form Submit */
  submit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const finalRole = `${this.taskForm.value.role} - ${this.taskForm.value.roleUser}`;
    const formData: Task = {
      ...this.taskForm.getRawValue(),
      role: finalRole,
      createdBy: this.userName,
      assignedDate: today
    };

    if (this.editId) {
      // 🔹 Update existing task
      this.service.updateTask(this.editId, formData).subscribe({
        next: () => {
          alert('✅ Task updated successfully!');
          if (this.refresh) this.refresh();
          this.taskSubmitted.emit();
          this.formClosed.emit();
          this.router.navigate(['/dashboard']); // ✅ Stay logged in & show task-table
        },
        error: (err) => {
          console.error('❌ Error updating task:', err);
          alert('Failed to update task. Please try again.');
        }
      });
    } else {
      // 🔹 Create new task
      this.service.createTask(formData).subscribe({
        next: () => {
          alert('✅ Task added successfully!');
          this.taskForm.reset();
          this.taskSubmitted.emit();   // ← Tell parent to refresh
          this.formClosed.emit(); 
          this.taskForm.patchValue({
            assignedTo: this.userName,
            roleUser: this.userName
          });
          if (this.refresh) this.refresh();
        },
        error: (err) => {
          console.error('❌ Error adding task:', err);
          alert('Failed to add task. Please try again.');
        }
      });
    }
  }
}