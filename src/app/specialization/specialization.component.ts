import { Component, OnInit, HostListener } from '@angular/core';
import { TaskService, PhaseTask } from 'src/app/task.service';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-specialization',
  templateUrl: './specialization.component.html',
  styleUrls: ['./specialization.component.css']
})
export class SpecializationComponent implements OnInit {
  userName = '';
  userRole = '';
  isPM = false;

  projects: any[] = [];
  filteredProjects: any[] = [];
  projectPhaseTasksMap: { [key: string]: PhaseTask[] } = {};
  expandedProjects = new Set<string>();
  expandedPOCTasks = new Set<string>(); // ✅ For expanding POC subtasks

  accountNames: string[] = [];
  selectedAccount: string | null = null;

  hiddenProjects: Set<string> = new Set();
  showHiddenOnly = false;
  menuOpen = false;
   totalAccounts = 0;
    accountProjectCount: { [key: string]: number } = {};

  // Filters
  statusOptions = ['Open', 'WIP', 'Completed', 'Closed'];
  selectedStatuses = ['Open', 'WIP'];
  assigneeOptions: string[] = [];
  selectedPMs: string[] = [];
  searchText = '';
  dropdowns = { pm: false, status: false };
  pmSearch = '';
  filteredPMs: string[] = [];
  showProjectForm = false;
  showAccountForm = false;
  editingProject: any = null;

  // Summary
  totalProjects = 0;
  assignedProjects = 0;
  totalTasks = 0;
  assignedTasks = 0;

  constructor(private service: TaskService, private router: Router) {}

  ngOnInit(): void {
    const storedUserName = localStorage.getItem('userName');
    const storedUserRole = localStorage.getItem('userRole');
    const storedIsPM = localStorage.getItem('isPM');

    if (!storedUserName || !storedUserRole) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = storedUserName;
    this.userRole = storedUserRole;
    this.isPM = storedIsPM === '1';
    this.loadHiddenProjects();
    this.loadData();
  }

  canEditOrDelete(): boolean {
    return this.userRole === 'Admin' || this.isPM;
  }
  openAccountForm() {
    if (this.userRole === 'Admin') this.showAccountForm = true;
    else alert('You don’t have access.');
  }

  openForm() {
    if (this.userRole === 'Admin' || this.isPM) {
      this.editingProject = null;
      this.showProjectForm = true;
    } else alert('You don’t have access to add projects.');
  }

  private loadHiddenProjects() {
  const saved = localStorage.getItem('hiddenProjects');
  if (saved) {
    this.hiddenProjects = new Set(JSON.parse(saved));
  }
}
goToAllTasks() {
    this.router.navigate(['/dashboard']);
  }

private saveHiddenProjects() {
  localStorage.setItem('hiddenProjects', JSON.stringify(Array.from(this.hiddenProjects)));
}

// Hide project (Admin only)
hideProject(projectName: string) {
  if (!confirm(`Hide project "${projectName}" from this page?`)) return;

  this.hiddenProjects.add(projectName);
  this.saveHiddenProjects();
  this.applyFilters(); // Refresh UI
}
 toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

toggleHiddenView() {
  this.showHiddenOnly = !this.showHiddenOnly;
  this.selectedAccount = null;
  this.selectedPMs = [];
  this.selectedStatuses = ['Open', 'WIP'];
  this.searchText = '';
  this.applyFilters();
}

toggleDropdown(type: 'pm' | 'status' | 'phase') {
    switch (type) {
      case 'pm':
        this.dropdowns.pm = !this.dropdowns.pm;
        break;
      case 'status':
        this.dropdowns.status = !this.dropdowns.status;
        break;
    }

    const keys: Array<keyof typeof this.dropdowns> = ['pm', 'status'];
    keys.forEach(key => {
      if (key !== type) this.dropdowns[key] = false;
    });
  }
  @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event) {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-filter')) {
        this.dropdowns = { pm: false, status: false };
        this.pmSearch = '';
        this.filteredPMs = [...this.assigneeOptions];
      }
    }
  filterPMs() {
    this.filteredPMs = this.assigneeOptions.filter(pm =>
      pm.toLowerCase().includes(this.pmSearch.toLowerCase())
    );
  }

  /** ✅ Load all projects and tasks */
  loadData() {
    this.service.getProjects().subscribe(projects => {
      this.projects = projects;
      this.filteredProjects = [...projects];
      this.totalProjects = projects.length;
      this.assignedProjects = projects.filter(p => p.pmName === this.userName).length;

      const pmSet = new Set<string>();
      projects.forEach(p => { if (p.pmName) pmSet.add(p.pmName); });
      this.assigneeOptions = Array.from(pmSet);

      this.service.getAccounts().subscribe(accounts => {
        this.accountNames = accounts.map(a => a.accountName);
      });

      this.service.getPhaseTasks().subscribe(tasks => {
        this.projectPhaseTasksMap = {};
        const validProjectNames = new Set(projects.map(p => p.projectName));

        tasks.forEach(task => {
          if (task.projectName && validProjectNames.has(task.projectName)) {
            if (!this.projectPhaseTasksMap[task.projectName]) {
              this.projectPhaseTasksMap[task.projectName] = [];
            }
            this.projectPhaseTasksMap[task.projectName].push(task);
          }
        });

        // Ensure default main tasks and POC subtasks per project,
        // then refresh each project's tasks map so UI remains consistent.
        projects.forEach(p => this.ensureDefaultTasks(p.projectName));

        this.totalTasks = Object.values(this.projectPhaseTasksMap)
          .reduce((sum, arr) => sum + arr.length, 0);

        this.assignedTasks = Object.values(this.projectPhaseTasksMap)
          .flat()
          .filter(t => t.assignedTo === this.userName).length;

        this.applyFilters();
      });
    });
  }

  /** ✅ Ensure default + POC subtasks */
  /** ✅ Ensure only main tasks are created, and subtasks only for "POC Funding" */
  ensureDefaultTasks(projectName: string) {
    const defaultTaskNames = [
      'POC Funding',
      'MAP Funding',
      'GEN AI Funding',
      'CEI',
      'WAF',
      'Opportunity Launch'
    ];

    // Load all tasks once to determine missing main tasks
    this.service.getPhaseTasks().subscribe(allTasks => {
      const projectTasks = allTasks.filter(t => t.projectName === projectName);

      // Identify missing MAIN tasks
      const missingMainTasks = defaultTaskNames.filter(
        name => !projectTasks.some(t => t.taskName === name)
      );

      const createMainTasksPromises = missingMainTasks.map(name => {
        const newTask: PhaseTask = {
          projectName,
          taskName: name,
          status: 'Open',
          assignedDate: '',
          assignedTo: '',
          remarks: ''
        };
        return this.service.createPhaseTask(newTask).toPromise();
      });

      // After main tasks created, check for POC Funding and create subtasks if needed
      Promise.all(createMainTasksPromises).then(() => {
        this.service.getPhaseTasks().subscribe(updatedTasks => {
          const projectUpdatedTasks = updatedTasks.filter(t => t.projectName === projectName);

          const pocFundingTask = projectUpdatedTasks.find(t => t.taskName === 'POC Funding');
          if (pocFundingTask) {
            // createPOCSubtasksIfNeeded will return an observable that completes when creations complete
            this.createPOCSubtasksIfNeeded(projectName, projectUpdatedTasks).subscribe({
              next: () => {
                // Refresh project's tasks map so UI shows newly created tasks/subtasks in correct places
                this.loadPhaseTasksForProject(projectName);
                // Update totals
                this.updateTotals();
              },
              error: () => {
                // Even on error, refresh to keep UI consistent
                this.loadPhaseTasksForProject(projectName);
                this.updateTotals();
              }
            });
          } else {
            console.log(`🟡 No "POC Funding" task found for ${projectName} — skipping subtasks.`);
            // Still refresh so main tasks appear
            this.loadPhaseTasksForProject(projectName);
            this.updateTotals();
          }
        });
      }).catch(err => {
        console.error('Error creating default main tasks', err);
      });
    });
  }

  /** ✅ Create subtasks ONLY under "POC Funding" — no other phase
   * Returns Observable that completes when all create calls are done (or immediately if none needed)
   */
  private createPOCSubtasksIfNeeded(projectName: string, projectTasks: PhaseTask[]): Observable<any> {
    const pocSubtasks = [
      'POC Doc',
      'POA Doc',
      'Calculator',
      'Architecture',
      'Account Manager Approval',
      'Funding Raised',
      'Credit Received'
    ];

    const createCalls: Observable<PhaseTask>[] = [];

    pocSubtasks.forEach(sub => {
      const subtaskName = `POC Funding - ${sub}`;
      const alreadyExists = projectTasks.some(t => t.taskName === subtaskName);
      if (!alreadyExists) {
        const newSubtask: PhaseTask = {
          projectName,
          taskName: subtaskName,
          status: 'Open',
          assignedDate: '',
          assignedTo: '',
          remarks: ''
        };
        createCalls.push(this.service.createPhaseTask(newSubtask));
      }
    });

    if (createCalls.length) {
      // Wait for all creations to finish
      return forkJoin(createCalls);
    } else {
      // Nothing to create — return an observable that completes immediately
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
  }

  /** ✅ Load all tasks for a given project */
  loadPhaseTasksForProject(projectName: string) {
    this.service.getPhaseTasks().subscribe(tasks => {
      this.projectPhaseTasksMap[projectName] = tasks.filter(
        t => t.projectName === projectName
      );
      this.updateTotals();
    });
  }

  private updateTotals() {
    this.totalTasks = Object.values(this.projectPhaseTasksMap)
      .reduce((sum, arr) => sum + arr.length, 0);

    this.assignedTasks = Object.values(this.projectPhaseTasksMap)
      .flat()
      .filter(t => t.assignedTo === this.userName).length;
  }

  toggleTasks(projectName: string) {
    if (this.expandedProjects.has(projectName)) this.expandedProjects.delete(projectName);
    else this.expandedProjects.add(projectName);
  }

  togglePOCSubtasks(projectName: string) {
    if (this.expandedPOCTasks.has(projectName)) this.expandedPOCTasks.delete(projectName);
    else this.expandedPOCTasks.add(projectName);
  }

  isProjectExpanded(projectName: string): boolean {
    return this.expandedProjects.has(projectName);
  }

  isPOCExpanded(projectName: string): boolean {
    return this.expandedPOCTasks.has(projectName);
  }

  editPhaseTask(task: PhaseTask) {
    this.router.navigate(['/phasetask'], {
      queryParams: { projectName: task.projectName, taskId: task.id }
    });
  }

  deletePhaseTask(id: number | undefined, projectName: string | undefined) {
    if (this.userRole !== 'Admin') {
      alert('❌ Only Admin can delete tasks.');
      return;
    }
    if (!id || !projectName) return;

    this.service.deletePhaseTask(id).subscribe(() => {
      this.projectPhaseTasksMap[projectName] =
        this.projectPhaseTasksMap[projectName].filter(t => t.id !== id);
      this.totalTasks--;
    });
  }

  // Existing filter methods unchanged ...
  togglePM(pm: string) {
    this.selectedPMs = this.selectedPMs.includes(pm)
      ? this.selectedPMs.filter(p => p !== pm)
      : [...this.selectedPMs, pm];
    this.applyFilters();
  }

  toggleStatus(status: string) {
    this.selectedStatuses = this.selectedStatuses.includes(status)
      ? this.selectedStatuses.filter(s => s !== status)
      : [...this.selectedStatuses, status];
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
    this.searchText = '';
    this.applyFilters();
  }

  applyFilters() {
  let candidates = this.projects;

  // STEP 1: Decide which projects to consider
  if (this.showHiddenOnly) {
    // SHOW ONLY HIDDEN projects
    candidates = this.projects.filter(p => this.hiddenProjects.has(p.projectName));
  } else {
    // NORMAL MODE: Hide hidden projects
    candidates = this.projects.filter(p => !this.hiddenProjects.has(p.projectName));
  }

  // STEP 2: Apply other filters
  this.filteredProjects = candidates
    .filter(p => {
      const accountMatch = this.selectedAccount
        ? (p.account?.accountName === this.selectedAccount || p.accountName === this.selectedAccount)
        : true;
      const pmMatch = this.selectedPMs.length ? this.selectedPMs.includes(p.pmName) : true;
      const statusMatch = this.selectedStatuses.length ? this.selectedStatuses.includes(p.status) : true;
      const searchMatch = this.searchText
        ? p.projectName?.toLowerCase().includes(this.searchText.toLowerCase())
        : true;
      return accountMatch && pmMatch && statusMatch && searchMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.assignedDate || 0).getTime();
      const dateB = new Date(b.assignedDate || 0).getTime();
      return dateB - dateA; // newest first
    });
}

  clearHiddenProjects() {
  this.hiddenProjects.clear();
  this.saveHiddenProjects();
  this.applyFilters();
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
  openAddTaskForm(projectName: string) {
    this.router.navigate(['/phasetask'], { queryParams: { projectName } });
  }
  showAssignedTasks() {
    this.filteredProjects = this.projects.filter(project => (this.projectPhaseTasksMap[project.projectName]
      || []).some( task => task.assignedTo === this.userName ) );
  }
  showAssignedProjects() {
    this.filteredProjects = this.projects.filter(p => p.pmName === this.userName);
  }

  /**
   * Return POC subtasks for a given project ONLY when the parent phase is "POC Funding".
   * If parentTaskName is provided and isn't "POC Funding", an empty array is returned.
   */
  getPOCSubtasks(projectName: string): PhaseTask[] {
  const tasks = this.projectPhaseTasksMap[projectName] || [];
  const subtaskOrder = [
    'POC Doc',
    'POA Doc',
    'Calculator',
    'Architecture',
    'Account Manager Approval',
    'Funding Raised',
    'Credit Received'
  ];

  const subtasks = tasks
    .filter(t => t.taskName?.startsWith('POC Funding - '))
    .map(t => ({
      ...t,
      displayName: t.taskName!.replace('POC Funding - ', '')
    }));

  // Sort by predefined order
  return subtasks.sort((a, b) => {
    const aIndexShort = subtaskOrder.indexOf(a.displayName);
    const bIndexShort = subtaskOrder.indexOf(b.displayName);
    return aIndexShort - bIndexShort;
  });
}

}