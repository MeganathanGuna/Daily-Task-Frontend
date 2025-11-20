import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskTableComponent } from '../task-table/task-table.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  selectedProject: string = '';
  showTaskForm = false;         // Controls modal
  selectedRow: any = null;
  userName: string = '';
  assignedFilterEnabled = false;
  menuOpen = false;

  @ViewChild(TaskTableComponent) tableComponent!: TaskTableComponent;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const storedUser = localStorage.getItem('userName');
    if (!storedUser) {
      this.router.navigate(['/login']);
    } else {
      this.userName = storedUser;
    }

    this.route.queryParams.subscribe(params => {
      this.selectedProject = params['project'] || '';
    });

    // Restore filter state
    this.assignedFilterEnabled = localStorage.getItem('assignedFilterEnabled') === 'true';
    setTimeout(() => this.toggleAssignedFilter(), 100);
  }

  toggleAssignedFilter() {
    if (this.assignedFilterEnabled) {
      localStorage.setItem('assignedFilterEnabled', 'true');
    } else {
      localStorage.removeItem('assignedFilterEnabled');
    }

    if (this.tableComponent) {
      this.tableComponent.assignedFilterEnabled = this.assignedFilterEnabled;
      this.tableComponent.applyFilters();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openForm() {
    this.selectedRow = null;
    this.showTaskForm = true;
  }

  editRow(row: any) {
    this.selectedRow = row;
    this.showTaskForm = true;
  }

  onTaskSubmitted() {
    this.closeTaskModal();
    if (this.tableComponent) {
      this.tableComponent.loadTasks(); // Refresh table
    }
  }

  closeTaskModal() {
    this.showTaskForm = false;
    this.selectedRow = null;
  }
  reload = () => {
    this.closeTaskModal();
    setTimeout(() => (this.showTaskForm = false), 0);
  };

  goToAllTasks() {
    this.selectedProject = '';
    this.assignedFilterEnabled = false;
    localStorage.removeItem('assignedFilterEnabled');
    if (this.tableComponent) {
      this.tableComponent.selectedProject = '';
      this.tableComponent.assignedFilterEnabled = false;
      this.tableComponent.applyFilters();
    }
  }
  

  goHome() {
    this.router.navigate(['/']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}