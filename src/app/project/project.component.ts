import { Component, OnInit, HostListener } from '@angular/core';
import { TaskService, Project, Task } from 'src/app/task.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css']
})
export class ProjectComponent implements OnInit {
  userName: string = '';
  userRole: string = '';
  isPM: boolean = false;

  editingProject: any = null;
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  projectTasksMap: { [key: string]: Task[] } = {};
  expandedProjects = new Set<string>();
  accountNames: string[] = [];
  accountProjectCount: { [key: string]: number } = {};
  selectedAccount: string | null = null;
  showProjectForm = false;
  showAccountForm = false;

  selectedProjectForTasks: any = null;
  createDefaultTasks: boolean = true;
  menuOpen = false;

  // Filters
  statusOptions: string[] = ['Open', 'WIP', 'Completed', 'Closed'];
  selectedStatuses: string[] = ['Open', 'WIP'];
  phaseOptions: string[] = [
    'Estimation', 'SOW', 'Billing Migration',
    'Implementation', 'Program', 'Operation Handover'
  ];
  selectedPhases: string[] = [];
  assigneeOptions: string[] = [];
  selectedPMs: string[] = [];
  searchText: string = '';

  totalAccounts = 0;

  // Summary counts
  totalProjects = 0;
  assignedProjects = 0;
  totalTasks = 0;
  assignedTasks = 0;

  // Status counts
  openProjects = 0;
  wipProjects = 0;
  completedProjects = 0;

  openTasks = 0;
  wipTasks = 0;
  completedTasks = 0;

  previousPhaseMap: { [key: number]: string } = {};

  // Popup control
  showPopup: boolean = false;
  popupDocked: boolean = false;

  // Keep all tasks for re-filtering
  allTasks: Task[] = [];
  filteredTasks: Task[] = [];

  // Dropdown Filters
  dropdowns = { pm: false, status: false, phase: false };
  pmSearch = '';
  filteredPMs: string[] = [];

  constructor(private service: TaskService, private router: Router) {}

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
    this.isPM = storedIsPM === 'true';

    console.log('User Info:', {
      userName: this.userName,
      userRole: this.userRole,
      isPM: this.isPM
    });

    this.loadProjects();

    const popupShown = sessionStorage.getItem('welcomePopupShown');
    if (!popupShown) {
      setTimeout(() => this.openPopup(), 600);
      sessionStorage.setItem('welcomePopupShown', 'true');
    }
  }

  toggleDropdown(type: 'pm' | 'status' | 'phase') {
    switch (type) {
      case 'pm':
        this.dropdowns.pm = !this.dropdowns.pm;
        break;
      case 'status':
        this.dropdowns.status = !this.dropdowns.status;
        break;
      case 'phase':
        this.dropdowns.phase = !this.dropdowns.phase;
        break;
    }

    const keys: Array<keyof typeof this.dropdowns> = ['pm', 'status', 'phase'];
    keys.forEach(key => {
      if (key !== type) this.dropdowns[key] = false;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-filter')) {
      this.dropdowns = { pm: false, status: false, phase: false };
      this.pmSearch = '';
      this.filteredPMs = [...this.assigneeOptions];
    }
  }

  filterPMs() {
    this.filteredPMs = this.assigneeOptions.filter(pm =>
      pm.toLowerCase().includes(this.pmSearch.toLowerCase())
    );
  }

  openTasksPopup(project: any) {
    this.selectedProjectForTasks = project;
  }

  closeTasksPopup() {
    this.selectedProjectForTasks = null;
  }

  loadProjects() {
    this.service.getProjects().subscribe(projects => {
      // MAIN SORT: Most recent first (by assignedDate)
    this.projects = projects.sort((a, b) => {
      const dateA = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
      const dateB = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
      return dateB - dateA; // Latest first
    });

      this.openProjects = projects.filter(p => p.status === 'Open' && p.pmName === this.userName).length;
      this.wipProjects = projects.filter(p => p.status === 'WIP' && p.pmName === this.userName).length;
      this.completedProjects = projects.filter(p => p.status === 'Completed' && p.pmName === this.userName).length;

      this.filteredProjects = [...projects];
      this.totalProjects = projects.length;
      this.assignedProjects = projects.filter(p => p.pmName === this.userName).length;

      this.accountProjectCount = {};
      projects.forEach(p => {
        const acc = p.account?.accountName || p.accountName || 'Unknown';
        if (!this.accountProjectCount[acc]) this.accountProjectCount[acc] = 0;
        this.accountProjectCount[acc]++;
      });

      this.service.getAccounts().subscribe(accounts => {
        const sortedNames = accounts
          .map(a => a.accountName)
          .sort((a, b) => a.localeCompare(b));
        this.accountNames = sortedNames;
        this.totalAccounts = accounts.length;
      });

      const pmSet = new Set<string>();
      projects.forEach(p => { if (p.pmName) pmSet.add(p.pmName); });
      this.assigneeOptions = Array.from(pmSet);
      this.filteredPMs = [...this.assigneeOptions]; // Initialize after load

      this.loadAllTasks();
      this.applyFilters();
      this.projects.forEach(p => this.loadTasksForProject(p.projectName));
    });
  }

  isExpired(task: any): boolean {
    if (!task.endDate) return false;
    const today = new Date();
    const due = new Date(task.endDate);
    return due < today && task.status !== 'Completed' && task.status !== 'Closed';
  }

  createAutoTasks(project: Project): void {
    const allDefaultTasks = [
      'Estimation', 'Estimation QC',
      'SOW', 'SOW QC', 'SOW Sign off followup', 'Updating Client Billing Details', 'Opp Creation',
      'Billing Migration',
      'Account Creation', 'Kick -off', 'Project Plan', 'Cost Optimization',
      'Operation Handover'
    ];

    const today = new Date().toISOString().split('T')[0];

    allDefaultTasks.forEach(taskName => {
      const autoTask = {
        assignedDate: today,
        projectName: project.projectName,
        projectTitle: taskName,
        assignedTo: this.userName,
        role: `Default Tasks - Created - ${this.userName}`,
        roleUser: this.userName,
        status: 'Open',
        remarks: `Auto created standard task: ${taskName}`,
        endDate: today,
        createdBy: this.userName
      };

      this.service.createTask(autoTask).subscribe({
        next: () => this.loadTasksForProject(project.projectName),
        error: err => console.error('Error creating auto task:', err)
      });
    });
  }

  renameTasksInProject(oldName: string, newName: string) {
    this.service.getTasks().subscribe(tasks => {
      const tasksToUpdate = tasks.filter(t => t.projectName === oldName);

      if (this.projectTasksMap[oldName]) {
        this.projectTasksMap[newName] = [...this.projectTasksMap[oldName]];
        delete this.projectTasksMap[oldName];
      }

      tasksToUpdate.forEach(task => {
        const updatedTask = { ...task, projectName: newName };
        this.service.updateTask(task.id!, updatedTask).subscribe({
          error: err => console.error('Failed to update task:', err)
        });
      });
      this.updateTaskCounts();
    });
  }

  updateTaskCounts() {
    this.service.getTasks().subscribe(tasks => {
      const userTasks = tasks.filter(t => {
        const assignedUser = t.role?.split(' - ')[1]?.trim()?.toLowerCase();
        return assignedUser === this.userName.toLowerCase();
      });

      this.assignedTasks = userTasks.length;
      this.openTasks = userTasks.filter(t => t.status === 'Open').length;
      this.wipTasks = userTasks.filter(t => t.status === 'WIP').length;
      this.completedTasks = userTasks.filter(t => t.status === 'Completed').length;
    });
  }

  // In project.component.ts
  onProjectFormClosed(createDefaultTasks: boolean) {
      this.createDefaultTasks = createDefaultTasks;
      this.closeProjectForm(); // This now uses the correct toggle state
  }

  closeProjectForm() {
  this.showProjectForm = false;
  this.editingProject = null;

  // Capture old project IDs BEFORE updating the list
  const oldProjectIds = new Set(this.projects.map(p => p.id).filter(id => id != null));

  this.service.getProjects().subscribe(freshProjects => {
    // === 1. Detect renamed projects ===
    const renameMap = new Map<string, string>(); // oldName → newName

    freshProjects.forEach(newProj => {
      const oldProj = this.projects.find(p => p.id === newProj.id);
      if (oldProj && oldProj.projectName !== newProj.projectName) {
        renameMap.set(oldProj.projectName, newProj.projectName);
        console.log(`Renamed: ${oldProj.projectName} → ${newProj.projectName}`);
      }
    });

    // === 2. Update main list (with correct sort) ===
    this.projects = freshProjects.sort((a, b) => {
      const dateA = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
      const dateB = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
      return dateB - dateA;
    });

    this.filteredProjects = [...this.projects];
    this.applyFilters();

    // === 3. RENAME TASKS IF NEEDED ===
    if (renameMap.size > 0) {
      this.service.getTasks().subscribe(allTasks => {
        const tasksToUpdate: Task[] = [];

        allTasks.forEach(task => {
          if (renameMap.has(task.projectName)) {
            tasksToUpdate.push({
              ...task,
              projectName: renameMap.get(task.projectName)!
            });
          }
        });

        if (tasksToUpdate.length > 0) {
          tasksToUpdate.forEach(task => {
            this.service.updateTask(task.id!, task).subscribe();
          });

          // Update local cache instantly
          tasksToUpdate.forEach(task => {
            const oldName = task.projectName;
            const newName = renameMap.get(oldName)!;
            delete Object.assign(this.projectTasksMap, {
              [newName]: this.projectTasksMap[oldName] || []
            })[oldName];
          });
        }
      });
    }

    // === 4. DETECT BRAND NEW PROJECTS (THIS WAS BROKEN BEFORE) ===
    const trulyNewProjects = freshProjects.filter(p =>
      p.id && !oldProjectIds.has(p.id)
    );

    console.log('New projects detected:', trulyNewProjects.map(p => p.projectName));

    if (this.createDefaultTasks && trulyNewProjects.length > 0) {
      console.log('Creating default tasks...');
      trulyNewProjects.forEach(project => this.createAutoTasks(project));
    } else if (trulyNewProjects.length > 0) {
      console.log('Default tasks skipped — toggle was OFF');
    }

    // === 5. Final refresh ===
    this.loadAllTasks();
    this.projects.forEach(p => this.loadTasksForProject(p.projectName));

    // Reset toggle to ON for next time
    setTimeout(() => this.createDefaultTasks = true, 1000);
  });
}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  getProgress(project: Project): number {
    const tasks = this.projectTasksMap[project.projectName] || [];
    if (!tasks.length) return 0;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  getDaysLeft(project: Project): string {
    const end = new Date(project.assignedDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `Overdue ${Math.abs(diff)} days`;
    if (diff === 0) return 'Due Today';
    return `${diff} day${diff > 1 ? 's' : ''} left`;
  }

  isProjectOverdue(project: Project): boolean {
    const end = new Date(project.assignedDate);
    return end < new Date();
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN');
  }

  loadAllTasks() {
    this.service.getTasks().subscribe(tasks => {  
      this.totalTasks = tasks.length;

      // ✅ Store all tasks for later filtering
      this.allTasks = tasks;
      

      // ✅ Filter only user’s tasks
      const userTasks = tasks.filter(t => {
        const assignedUser = t.role?.split(' - ')[1]?.trim()?.toLowerCase();
        return assignedUser === this.userName.toLowerCase();
      });

      // ✅ Compute counts for logged-in user
      
      this.assignedTasks = userTasks.length;
      this.openTasks = userTasks.filter(t => t.status === 'Open').length;
      this.wipTasks = userTasks.filter(t => t.status === 'WIP').length;
      this.completedTasks = userTasks.filter(t => t.status === 'Completed').length;

      // ✅ Build project-wise map for user tasks
      this.projectTasksMap = {};
      userTasks.forEach(t => {
        if (!this.projectTasksMap[t.projectName]) this.projectTasksMap[t.projectName] = [];
        this.projectTasksMap[t.projectName].push(t);
      });

      this.filteredTasks = userTasks;
    });
  }

  filterTasksByStatus(status: string) {
    if (!this.allTasks.length) return;
    const userTasks = this.allTasks.filter(t => {
      const assignedUser = t.role?.split(' - ')[1]?.trim()?.toLowerCase();
      return assignedUser === this.userName.toLowerCase();
    });

    const filtered = status === 'All' ? userTasks : userTasks.filter(t => t.status === status);
    this.filteredTasks = filtered;

    this.projectTasksMap = {};
    filtered.forEach(t => {
      if (!this.projectTasksMap[t.projectName]) this.projectTasksMap[t.projectName] = [];
      this.projectTasksMap[t.projectName].push(t);
    });

    const visibleProjects = new Set(filtered.map(t => t.projectName));
    this.filteredProjects = this.projects.filter(p => visibleProjects.has(p.projectName));
  }

  openPopup() { this.showPopup = true; }
  closePopup() { this.showPopup = false; this.popupDocked = true; }

  showAssignedProjects() {
    this.filteredProjects = this.projects.filter(p => p.pmName === this.userName);
  }

  showOpenProjects() {
    this.filteredProjects = this.projects.filter(p => p.status === 'Open' && p.pmName === this.userName);
  }

  showWipProjects() {
    this.filteredProjects = this.projects.filter(p => p.status === 'WIP' && p.pmName === this.userName);
  }

  showCompletedProjects() {
    this.filteredProjects = this.projects.filter(p => p.status === 'Completed' && p.pmName === this.userName);
  }

  showOpenTasks() { this.filterTasksByStatus('Open'); }
  showWipTasks() { this.filterTasksByStatus('WIP'); }
  showCompletedTasks() { this.filterTasksByStatus('Completed'); }
  showAssignedTasks() { this.filterTasksByStatus('All'); } // FIXED

  toggleStatus(status: string) {
    this.selectedStatuses = this.selectedStatuses.includes(status)
      ? this.selectedStatuses.filter(s => s !== status)
      : [...this.selectedStatuses, status];
    this.applyFilters();
  }

  togglePM(pm: string) {
    this.selectedPMs = this.selectedPMs.includes(pm)
      ? this.selectedPMs.filter(p => p !== pm)
      : [...this.selectedPMs, pm];
    this.applyFilters();
  }

  togglePhase(phase: string) {
    this.selectedPhases = this.selectedPhases.includes(phase)
      ? this.selectedPhases.filter(p => p !== phase)
      : [...this.selectedPhases, phase];
    this.applyFilters();
  }

  filterByAccount(account: string) {
    this.selectedAccount = account;
    this.applyFilters();
  }

  showAllAccounts() {
    this.selectedAccount = null;
    this.applyFilters();
  }

  clearFilters() {
    this.selectedAccount = null;
    this.selectedPMs = [];
    this.selectedStatuses = ['Open', 'WIP'];
    this.selectedPhases = [];
    this.searchText = '';
    this.filteredProjects = [...this.projects];
    this.applyFilters();
  }

  applyFilters() {
    this.filteredProjects = this.projects.filter(p => {
      const accountMatch = this.selectedAccount
        ? (p.account?.accountName === this.selectedAccount || p.accountName === this.selectedAccount)
        : true;
      const pmMatch = this.selectedPMs.length ? this.selectedPMs.includes(p.pmName) : true;
      const statusMatch = this.selectedStatuses.length ? this.selectedStatuses.includes(p.status) : true;
      const phaseMatch = this.selectedPhases.length ? this.selectedPhases.includes(p.phases) : true;
      const searchMatch = this.searchText
        ? p.projectName.toLowerCase().includes(this.searchText.toLowerCase())
        : true;
      return accountMatch && pmMatch && statusMatch && phaseMatch && searchMatch;
    });

    this.filteredProjects.sort((a, b) => {
    const dateA = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
    const dateB = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
    return dateB - dateA;
  });
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

  openAccountForm() {
    if (this.userRole === 'Admin') this.showAccountForm = true;
    else alert('You don’t have access.');
  }

  closeAccountForm() {
    this.showAccountForm = false;
    this.loadProjects();
  }

  toggleTasks(project: string) {
    if (this.expandedProjects.has(project)) this.expandedProjects.delete(project);
    else this.expandedProjects.add(project);
  }

  isProjectExpanded(project: string) {
    return this.expandedProjects.has(project);
  }

  loadTasksForProject(project: string) { // FIXED METHOD NAME
    this.service.getTasks().subscribe(tasks => {
      this.projectTasksMap[project] = tasks.filter(t => t.projectName === project);
    });
  }

  isExpiredTask(task: any): boolean {
    const today = new Date();
    const endDate = new Date(task.endDate);
    const status = task.status?.toLowerCase();
    return endDate < today && status !== 'closed' && status !== 'completed';
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToAllTasks() {
    this.router.navigate(['/dashboard']);
  }
}