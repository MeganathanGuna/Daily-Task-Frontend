import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { TaskService, TimeAllocation } from 'src/app/task.service';
import { ChartConfiguration } from 'chart.js';

interface ExtendedTimeAllocation extends TimeAllocation {
  dynamicHours: { [date: string]: number };
}

@Component({
  selector: 'app-time-table',
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
export class TimeTableComponent implements OnInit {
  @Output() editAllocation = new EventEmitter<TimeAllocation>();

  allocations: TimeAllocation[] = [];
  groupedAllocations: ExtendedTimeAllocation[] = [];
  allAllocations: TimeAllocation[] = [];

  assignees: string[] = [];
  selectedAssignee: string = '';
  searchText: string = '';
  fromDate: string = '';
  toDate: string = '';

  loading = true;
  error = '';
  userName: string = '';

  dateColumns: string[] = [];

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Total Hours',
        backgroundColor: []
      }
    ]
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 12
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  public barChartType: 'bar' = 'bar';

  constructor(private taskService: TaskService, private router: Router) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';
    this.loadAllocations();
    this.loadUsers();
  }

  loadUsers(): void {
    this.taskService.getAllUsers().subscribe({
      next: (users) => {
        this.assignees = users.map(u => u.name);
      },
      error: () => {
        console.error('Failed to load users');
      }
    });
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedAssignee = '';
    this.fromDate = '';
    this.toDate = '';
    this.applyFilters();
  }

  getFormattedDate(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  }

  updateDateColumns(): void {
    this.dateColumns = [];

    if (this.fromDate && this.toDate) {
      const start = new Date(this.fromDate);
      const end = new Date(this.toDate);
      const current = new Date(start);

      while (current <= end) {
        this.dateColumns.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else {
      this.dateColumns = [
        this.getFormattedDate(-1),
        this.getFormattedDate(0),
        this.getFormattedDate(1)
      ];
    }
  }

  updateBarChart(): void {
    const labels = this.dateColumns;
    const data = labels.map(date => this.getTotalForDay(date));

    const backgroundColor = data.map(hours => {
      if (hours >= 6) return '#8b0000';
      if (hours > 0 && hours <= 3) return '#004d00';
      return '#1e90ff';
    });

    this.barChartData = {
      labels,
      datasets: [
        {
          data,
          label: 'Total Hours',
          backgroundColor
        }
      ]
    };
  }

  loadAllocations() {
    this.loading = true;
    this.taskService.getTimeAllocations().subscribe({
      next: (data) => {
        this.allAllocations = data;
        this.allocations = [...data];
        const usersSet = new Set(data.map(d => d.createdBy));
        usersSet.add(this.userName);
        this.assignees = Array.from(usersSet);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load time allocations.';
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let filtered = this.allAllocations;

    if (this.selectedAssignee) {
      filtered = filtered.filter(a => a.createdBy === this.selectedAssignee);
    }

    if (this.searchText) {
      const lower = this.searchText.toLowerCase();
      filtered = filtered.filter(a =>
        a.projectName.toLowerCase().includes(lower) || a.taskName.toLowerCase().includes(lower)
      );
    }

    if (this.fromDate) {
      filtered = filtered.filter(a => a.date >= this.fromDate);
    }

    if (this.toDate) {
      filtered = filtered.filter(a => a.date <= this.toDate);
    }

    this.allocations = filtered;
    this.updateDateColumns();
    this.groupedAllocations = this.groupByProjectAndTask();
    this.updateBarChart();
  }

  groupByProjectAndTask(): ExtendedTimeAllocation[] {
    const grouped: { [key: string]: ExtendedTimeAllocation } = {};

    for (const alloc of this.allocations) {
      const key = `${alloc.projectName}-${alloc.taskName}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...alloc,
          dynamicHours: {},
          projectName: alloc.projectName,
          taskName: alloc.taskName,
          id: alloc.id
        };

        for (const date of this.dateColumns) {
          grouped[key].dynamicHours[date] = 0;
        }
      }

      if (this.dateColumns.includes(alloc.date)) {
        grouped[key].dynamicHours[alloc.date] += Number(alloc.hours) || 0;
      }
    }

    return Object.values(grouped);
  }

  getTotalForRow(alloc: ExtendedTimeAllocation): number {
    return this.dateColumns.reduce((sum, date) => sum + (alloc.dynamicHours[date] || 0), 0);
  }

  getTotalForDay(date: string): number {
    return this.groupedAllocations.reduce((sum, alloc) => sum + (alloc.dynamicHours[date] || 0), 0);
  }

  getTotalOfAllDates(): number {
    return this.dateColumns.reduce((sum, date) => sum + this.getTotalForDay(date), 0);
  }

  deleteAllocation(id?: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this allocation?')) {
      this.taskService.deleteTimeAllocation(id).subscribe(() => this.loadAllocations());
    }
  }

  onEdit(allocation: TimeAllocation) {
    this.router.navigate(['/add-time'], { state: { allocation } });
  }
}
