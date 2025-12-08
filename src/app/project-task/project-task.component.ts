import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService, Task } from 'src/app/task.service';

@Component({
  selector: 'app-project-task',
  templateUrl: './project-task.component.html',
  styleUrls: ['./project-task.component.css']
})
export class ProjectTaskComponent implements OnInit {
  projectName: string = '';
  tasks: Task[] = [];
  userName: string = '';
  userRole: string = '';
  selectedTasks = new Set<number>(); // For checkboxes

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: TaskService
  ) {}

  ngOnInit(): void {
    this.projectName = this.route.snapshot.paramMap.get('projectName') || '';
    this.userName = localStorage.getItem('userName') || '';
    this.userRole = localStorage.getItem('userRole') || '';

    this.loadTasks();
  }

  loadTasks() {
    this.service.getTasks().subscribe(tasks => {
      this.tasks = tasks.filter(t => t.projectName === this.projectName);
    });
  }

  toggleSelect(taskId: number) {
    if (this.selectedTasks.has(taskId)) {
      this.selectedTasks.delete(taskId);
    } else {
      this.selectedTasks.add(taskId);
    }
  }

  isSelected(taskId: number): boolean {
    return this.selectedTasks.has(taskId);
  }

  canEditTask(task: Task): boolean {
    const assignedUser = task.role?.split(' - ')[1]?.trim() || '';
    return this.userRole === 'Admin' || assignedUser === this.userName;
  }

  editTask(task: Task) {
    // Navigate to task edit page or open modal - implement as needed
    console.log('Editing task:', task);
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN');
  }

  isOverdue(task: Task): boolean {
    if (!task.endDate) return false;
    const today = new Date();
    const due = new Date(task.endDate);
    return due < today && task.status !== 'Completed' && task.status !== 'Closed';
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
