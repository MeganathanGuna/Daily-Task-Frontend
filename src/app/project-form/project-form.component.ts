import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService, Project, Account } from '../task.service';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css'],
})
export class ProjectFormComponent implements OnInit, OnChanges {
  @Input() selectedAccount: string | null = null;
  @Input() editingProject: (Project & { limitedEdit?: boolean }) | null = null;

  // NEW: Emit toggle state to parent
  @Output() formClosed = new EventEmitter<boolean>();

  projectForm!: FormGroup;
  pmList: any[] = [];
  accounts: Account[] = [];

  // Toggle for default tasks
  createDefaultTasks: boolean = true;

  userRole: string = '';
  userName: string = '';
  isPM: boolean = false;

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole') || '';
    this.userName = localStorage.getItem('userName') || '';
    this.isPM = localStorage.getItem('isPM') === '1';

    this.initForm();

    this.taskService.getPMs().subscribe({
      next: (data) => (this.pmList = data),
      error: (err) => console.error('Failed to fetch PMs:', err),
    });

    this.loadAccounts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingProject'] && this.editingProject && this.projectForm) {
      this.patchFormWithProject(this.editingProject);
    }
  }

  private initForm(): void {
    this.projectForm = this.fb.group({
      assignedDate: ['', Validators.required],
      account: [null, Validators.required],
      projectName: ['', Validators.required],
      pmName: ['', Validators.required],
      status: ['', Validators.required],
      phases: ['', Validators.required],
      remarks: [''],
    });

    if (this.selectedAccount) {
      this.projectForm.get('account')?.disable();
    }
  }

  private patchFormWithProject(project: Project & { limitedEdit?: boolean }): void {
    const accountValue = project.account
      ? project.account
      : this.accounts.find((a) => a.accountName === project.accountName) || null;

    this.projectForm.patchValue({
      assignedDate: project.assignedDate,
      account: accountValue,
      projectName: project.projectName,
      pmName: project.pmName,
      status: project.status,
      phases: project.phases,
      remarks: project.remarks,
    });

    if (project.limitedEdit) {
      this.projectForm.get('assignedDate')?.disable();
      this.projectForm.get('account')?.disable();
      this.projectForm.get('projectName')?.disable();
      this.projectForm.get('pmName')?.disable();
    }
  }

  loadAccounts(): void {
    this.taskService.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        if (this.editingProject) {
          this.patchFormWithProject(this.editingProject);
        }
      },
      error: (err) => console.error('Failed to fetch accounts:', err),
    });
  }

  // UPDATED: Emit toggle state
  submit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const projectData: Project = this.projectForm.getRawValue();

    if (this.editingProject?.id) {
      const updated: Project = { ...this.editingProject, ...projectData };

      this.taskService.updateProject(this.editingProject.id, updated).subscribe({
        next: () => {
          alert('Project updated successfully');
          this.formClosed.emit(this.createDefaultTasks); // Emit toggle state
        },
        error: (err) => {
          console.error('Error updating project:', err);
          alert('Failed to update project');
        },
      });
    } else {
      this.taskService.createProject(projectData).subscribe({
        next: () => {
          alert('Project added successfully');
          this.formClosed.emit(this.createDefaultTasks); // Emit toggle state
        },
        error: (err) => {
          console.error('Error creating project:', err);
          alert('Failed to add project');
        },
      });
    }
  }

  onCancel(): void {
    this.formClosed.emit(false); // Don't create tasks on cancel
  }
}