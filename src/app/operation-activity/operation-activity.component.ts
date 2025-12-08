import { Component, OnInit } from '@angular/core';
import { TaskService, OperationProject, OperationTask } from '../task.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-operation-activity',
  templateUrl: './operation-activity.component.html',
  styleUrls: ['./operation-activity.component.css']
})
export class OperationActivityComponent implements OnInit {
  userName: string = '';
  userRole: string = '';
  menuOpen = false;
  showAccountForm = false;
  showProjectForm = false;
  editingProject: any = null;
  showEditTask = false;           // ← NEW: For Edit Modal
  editingTask: OperationTask | null = null;
  isPM: boolean = false;
  projectNames: string[] = [];
  selectedProject = '';
  tasks: OperationTask[] = [];
  allEmployees: string[] = [];
  groupedTasks: { [key: string]: OperationTask[] } = {};

  newProjectName = '';
  newTask: OperationTask = this.resetTask();
  showAddProject = false;
  showAddTask = false;

  selectedEmployee: string | null = null;
  selectedStatus: string | null = null;
  today = new Date().toISOString().split('T')[0];

  constructor(private taskService: TaskService, private router: Router) {}

  ngOnInit(): void {
    const storedUserName = localStorage.getItem('userName');
    const storedUserRole = localStorage.getItem('userRole');
    const storedIsPM = localStorage.getItem('pm') || localStorage.getItem('PM');

    if (!storedUserName || !storedUserRole) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = storedUserName;
    this.userRole = storedUserRole;

    console.log('User Info:', {
      userName: this.userName,
    });
    this.loadEmployees();
    this.loadProjectNames();
  }

  loadEmployees() {
    this.taskService.getAllUsers().subscribe(users => {
      this.allEmployees = users.map(u => u.name).sort();
    });
  }

  loadProjectNames() {
    this.taskService.getOperationProjectNames().subscribe(names => {
      this.projectNames = names;
      if (names.length > 0 && !this.selectedProject) {
        this.selectProject(names[0]);
      }
    });
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  selectProject(name: string) {
    this.selectedProject = name;
    this.loadTasks();
  }

  openAccountForm() {
    if (this.userRole === 'Admin') this.showAccountForm = true;
    else alert('You don’t have access.');
  }
  closeAccountForm() {
    this.showAccountForm = false;
    this.loadProjectNames();
  }
   goToAllTasks() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  goHome() {
    this.router.navigate(['/']);
  }

   openForm() {
    if (this.userRole === 'Admin' || this.isPM) {
      this.editingProject = null;
      this.showProjectForm = true;
    } else alert('You don’t have access to add projects.');
  }

  editProject(project: any) {
    if (this.userRole === 'Admin') {
      this.editingProject = { ...project, limitedEdit: false };
      this.showProjectForm = true;
    } else if (this.isPM && project.pmName === this.userName) {
      this.editingProject = { ...project, limitedEdit: true };
      this.showProjectForm = true;
    } else alert('You don’t have access to edit this project.');
  }

  loadTasks() {
    if (!this.selectedProject) return;
    this.taskService.getOperationTasksByProject(this.selectedProject).subscribe(tasks => {
      this.tasks = tasks;
      this.groupTasksByMonth();
    });
  }

  groupTasksByMonth() {
    const groups: { [key: string]: OperationTask[] } = {};

    this.tasks
      .filter(t => this.filterTask(t))
      .forEach(task => {
        const date = task.assignedDate ? new Date(task.assignedDate) : new Date();
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(task);
      });

    this.groupedTasks = groups;
  }

  filterTask(task: OperationTask): boolean {
    if (this.selectedEmployee && task.assignedTo !== this.selectedEmployee) return false;
    if (this.selectedStatus && task.status !== this.selectedStatus) return false;
    return true;
  }

  getTaskCount(projectName: string): number {
    return this.tasks.filter(t => t.operationProject?.projectName === projectName).length;
  }

  isOverdue(task: OperationTask): boolean {
    if (!task.dueDate || task.status === 'Completed') return false;
    return task.dueDate < this.today;
  }

  addProject() {
    if (!this.newProjectName.trim()) return;
    const proj = { projectName: this.newProjectName.trim() };
    this.taskService.createOperationProject(proj).subscribe(() => {
      this.loadProjectNames();
      this.newProjectName = '';
      this.showAddProject = false;
    });
  }

  addTask() {
    if (!this.newTask.taskName?.trim()) {
      alert('Task Name is required!');
      return;
    }
    if (!this.newTask.assignedTo) {
      alert('Please select an employee!');
      return;
    }

    const taskToSave: OperationTask = {
      ...this.newTask,
      operationProject: { projectName: this.selectedProject },
      assignedDate: this.newTask.assignedDate || this.today,
      status: this.newTask.status || 'Open'
    };

    this.taskService.createOperationTask(taskToSave).subscribe({
      next: () => {
        this.loadTasks();
        this.showAddTask = false;
        this.newTask = this.resetTask();
      },
      error: () => alert('Failed to create task')
    });
  }
  // ← NEW: OPEN EDIT MODAL WITH EXISTING DATA
  openEditTask(task: OperationTask) {
    this.editingTask = { ...task };
    this.showEditTask = true;
  }

  // ← NEW: SAVE UPDATED TASK
  saveEditedTask() {
    if (!this.editingTask || !this.editingTask.id) return;

    this.taskService.updateOperationTask(this.editingTask.id, this.editingTask).subscribe({
      next: () => {
        this.loadTasks();
        this.showEditTask = false;
        this.editingTask = null;
      },
      error: () => alert('Failed to update task')
    });
  }

  updateStatus(task: OperationTask) {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    const updated = { ...task, status: newStatus };
    this.taskService.updateOperationTask(task.id!, updated).subscribe(() => {
      task.status = newStatus;
      this.groupTasksByMonth();
    });
  }

  resetTask(): OperationTask {
    return {
      taskName: '',
      assignedTo: '',
      status: 'Open',
      link: '',
      assignedDate: this.today,
      dueDate: '',
      remarks: ''
    };
  }

  // THIS IS NOW A PROPER METHOD — Angular allows it in templates
  sortByMonthDesc(a: { key: string }, b: { key: string }): number {
    return new Date(b.key + ' 1').getTime() - new Date(a.key + ' 1').getTime(); // Latest first
  }
}