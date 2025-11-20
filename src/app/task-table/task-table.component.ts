import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  Directive,
  ElementRef,
  HostListener
} from '@angular/core';
import { TaskService, Task } from 'src/app/task.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-task-table',
  templateUrl: './task-table.component.html',
  styleUrls: ['./task-table.component.css'],
})
export class TaskTableComponent implements OnInit, OnChanges {
  @Input() projectFilter: string = '';
  @Input() userName: string = '';
  @Input() userFilterEnabled: boolean = false;
  @Input() assignedFilterEnabled: boolean = false;
  @Output() editRequested = new EventEmitter<Task>();

  allTasks: Task[] = [];
  tasks: Task[] = [];
  projectNames: string[] = [];
  selectedProject: string | null = null;
  projectTaskCounts: { [projectName: string]: number } = {};
  showActions: boolean = false;
  statusFilter: string[] = ['Open', 'WIP'];
  roleTypeFilterList: string[] = [];
  assigneeFilterList: string[] = [];
  globalSearch: string = '';
  roleTypes: string[] = [];
  roleUsers: string[] = [];
  userRole: string = '';
  dropdowns: { [key in 'status' | 'assignee' | 'role']: boolean } = {
  status: false,
  assignee: false,
  role: false
};

  constructor(private service: TaskService) {}

  ngOnInit(): void {
    this.userRole = (localStorage.getItem('userRole') || '').trim().toLowerCase();
    this.userName = (localStorage.getItem('userName') || '').trim().toLowerCase();
    this.loadProjects();
    this.loadTasks();
  }

  // Add this method
onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown-filter')) {
    this.dropdowns = { status: false, assignee: false, role: false };
  }
}


  toggleDropdown(type: 'status' | 'assignee' | 'role') {
  const isCurrentlyOpen = this.dropdowns[type];

  // Close ALL dropdowns first
  this.dropdowns = {
    status: false,
    assignee: false,
    role: false
  };

  // If it was closed → open it
  // If it was already open → it stays closed (toggle effect)
  if (!isCurrentlyOpen) {
    this.dropdowns[type] = true;
  }
}
// ADD THIS METHOD – Get count for a project
getTaskCount(projectName: string): number {
  return this.projectTaskCounts[projectName] || 0;
}

// ADD THIS – Total tasks for "Show All"
getTotalTaskCount(): number {
  return this.allTasks.length;
}

closeDropdown(type: 'status' | 'assignee' | 'role') {
  this.dropdowns[type] = false;
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectFilter'] && !changes['projectFilter'].firstChange) {
      this.applyFilters();
    }
  }

  loadProjects(): void {
  this.service.getProjects().subscribe((data) => {
    this.projectNames = data
      .map((p) => p.projectName)
      .sort((a, b) => a.localeCompare(b));   // <-- A-Z sort
  });
}

  loadTasks(): void {
    this.service.getTasks().subscribe((data) => {
      this.allTasks = data;
      // RECALCULATE TASK COUNTS PER PROJECT
    this.projectTaskCounts = {};
    this.allTasks.forEach(task => {
      const project = task.projectName || 'Unknown';
      this.projectTaskCounts[project] = (this.projectTaskCounts[project] || 0) + 1;
    });
      this.extractRoleTypes();
      this.extractRoleUsers();
      this.applyFilters();
    });
  }

  extractRoleTypes(): void {
    const set = new Set<string>();
    this.allTasks.forEach((task) => {
      const type = task.role?.split('-')[0]?.trim();
      if (type) set.add(type);
    });
    this.roleTypes = Array.from(set);
  }

  extractRoleUsers(): void {
    const set = new Set<string>();
    this.allTasks.forEach((task) => {
      const user = this.getAssigneeFromRole(task.role);
      if (user) set.add(user);
    });
    this.roleUsers = Array.from(set);
  }

  getAssigneeFromRole(role: string | undefined): string {
    if (!role) return '';
    const parts = role.split('-');
    return parts.length > 1 ? parts[1].trim().toLowerCase() : '';
  }

  /** ✅ Core filtering logic */
  applyFilters(): void {
    let filtered = [...this.allTasks];

    if (this.selectedProject) {
      filtered = filtered.filter(
        (task) => task.projectName === this.selectedProject
      );
    }

    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((task) =>
        this.statusFilter.includes(task.status || '')
      );
    }

    if (this.assigneeFilterList.length > 0) {
      filtered = filtered.filter((task) => {
        const assignee = this.getAssigneeFromRole(task.role).toLowerCase();
        return this.assigneeFilterList.some(
          (user) => user.toLowerCase() === assignee
        );
      });
    }

    if (this.roleTypeFilterList.length > 0) {
    filtered = filtered.filter(task => {
      const roleType = task.role?.split('-')[0]?.trim();
      return roleType && this.roleTypeFilterList.includes(roleType);
    });
  }

    if (this.globalSearch.trim() !== '') {
      const search = this.globalSearch.toLowerCase();
      filtered = filtered.filter((task) =>
        Object.values(task).some((val) =>
          val?.toString().toLowerCase().includes(search)
        )
      );
    }

    // ✅ My Tasks filter (createdBy OR assigned user)
    if (this.userFilterEnabled) {
      this.showActions = true;
      filtered = filtered.filter(
        (task) =>
          task.createdBy?.trim().toLowerCase() === this.userName ||
          this.getAssigneeFromRole(task.role) === this.userName
      );
    }

    // ✅ Assigned To Me filter
    if (this.assignedFilterEnabled) {
      this.showActions = true;
      filtered = filtered.filter(
        (task) => this.getAssigneeFromRole(task.role) === this.userName
      );
    }

    // ✅ Always show edit column for Admin / PM
    if (this.userRole === 'admin' || this.userRole === 'pm') {
      this.showActions = true;
    }

    // for latest assigned date first
    filtered.sort((a, b) => {
    const dateA = new Date(a.assignedDate || 0).getTime();
    const dateB = new Date(b.assignedDate || 0).getTime();
    return dateB - dateA; // newest first
  });

    this.tasks = filtered;
  }

  /** ✅ Expired check */
  isExpired(task: Task): boolean {
    const today = new Date();
    const endDate = new Date(task.endDate);
    const status = task.status?.toLowerCase();
    return endDate < today && status !== 'closed' && status !== 'completed';
  }

  /** ✅ Full edit (Admin / PM / Creator / Assigned Employee) */
  canEdit(task: Task): boolean {
    const currentUser = this.userName;
    const createdBy = task.createdBy?.trim().toLowerCase();
    const assignee = this.getAssigneeFromRole(task.role);

    // Admin or PM can edit any
    if (this.userRole === 'admin' || this.userRole === 'pm') return true;

    // Task creator can edit
    if (createdBy === currentUser) return true;

    // ✅ Assigned employee can also edit their own tasks
    if (assignee === currentUser) return true;

    return false;
  }

  /** ✅ Limited edit (future extension for auto tasks if needed) */
  canEditLimited(task: Task): boolean {
    return false; // all limited edit now handled by canEdit
  }

  edit(task: Task): void {
    this.editRequested.emit(task);
  }

  clearFilters(): void {
    this.statusFilter = ['Open', 'WIP'];
    this.roleTypeFilterList = [];
    this.assigneeFilterList = [];
    this.globalSearch = '';
    this.selectedProject = null;
    this.applyFilters();
  }

  downloadExcel(): void {
    if (!this.tasks.length) {
      alert('⚠️ No tasks available to download.');
      return;
    }

    const exportData = this.tasks.map((task) => ({
      'Project Name': task.projectName,
      'Task Name': task.projectTitle,
      Role: task.role,
      Status: task.status,
      Remarks: task.remarks,
      'Assigned Date': task.assignedDate,
      'Due Date': task.endDate,
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { Tasks: worksheet },
      SheetNames: ['Tasks'],
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const fileName = `Tasks_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
  }

  filterByProject(project: string): void {
    this.selectedProject = project;
    this.applyFilters();
  }

  clearProjectFilter(): void {
    this.selectedProject = null;
    this.applyFilters();
  }

  onCheckboxChange(filterType: string, value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    let targetArray: string[];

    if (filterType === 'status') targetArray = this.statusFilter;
    else if (filterType === 'role') targetArray = this.roleTypeFilterList;
    else targetArray = this.assigneeFilterList;

    const index = targetArray.indexOf(value);
    if (checked && index === -1) targetArray.push(value);
    else if (!checked && index > -1) targetArray.splice(index, 1);

    this.applyFilters();
  }
}
