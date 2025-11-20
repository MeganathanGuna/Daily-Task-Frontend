import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Account {
  id?: number;
  accountName: string;
}
// task.service.ts
export interface PhaseTask {
  id?: number;
  assignedDate: string;
  taskName: string;
  status: string;
  remarks: string;
  assignedTo: string;
  projectName?: string; // optional link for filtering
}
export interface Task {
  id?: number;
  assignedDate: string;
  projectName: string;
  projectTitle: string;
  assignedTo: string;
  role: string;
  status: string;
  remarks: string;
  endDate: string;
  createdBy: string;
}
export interface Project {
  id?: number;
  assignedDate: string;
  accountName: string;
  projectName: string;
  pmName: string; 
  status: string;
  phases: string;
  remarks: string;
  account: { id: number; accountName?: string }; // 👈 must send account object with id
}
export interface User {
  name: string;
  email: string;
}
export interface TimeAllocation {
  id?: number;
  projectName: string;
  taskName: string;
  date: string;
  hours: number;
  createdBy: string;
}
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:8080/tasks';
  private timeApiUrl = 'http://localhost:8080/tasks/time';
  private accountApiUrl = 'http://localhost:8080/tasks/accounts';
  private phaseTaskUrl = 'http://localhost:8080/phasetasks';
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
  constructor(private http: HttpClient) {}
  
  registerUser(name: string, email: string, password: string, role: string, isPM: boolean): Observable<any> {
  const body = { name, email, password, role, pm: isPM }; // ✅ send pm field
  return this.http.post(`${this.apiUrl}/register`, body, {
    headers: this.jsonHeaders,
    responseType: 'json'
  });
}

// ✅ Fetch PMs
getPMs(): Observable<User[]> {
  return this.http.get<User[]>(`${this.apiUrl}/pms`);
}


  loginUser(email: string, password: string): Observable<any> {
    const body = { email, password };
    return this.http.post(`${this.apiUrl}/login`, body, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'json'
    });
  }
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl);
  }
  createTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }
  updateTask(id: number, task: Task): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, task, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }
  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
  // Time Allocation Management
getTimeAllocations(): Observable<TimeAllocation[]> {
  return this.http.get<TimeAllocation[]>(`${this.timeApiUrl}/all`);
}
addTimeAllocation(allocation: TimeAllocation): Observable<TimeAllocation> {
  return this.http.post<TimeAllocation>(`${this.timeApiUrl}`, allocation, { headers: this.jsonHeaders });
}
updateTimeAllocation(allocation: TimeAllocation): Observable<TimeAllocation> {
  if (!allocation.id) {
    throw new Error('Allocation ID is required for update.');
  }
  return this.http.put<TimeAllocation>(`${this.timeApiUrl}/${allocation.id}`, allocation, { headers: this.jsonHeaders });
}
deleteTimeAllocation(id: number): Observable<void> {
  return this.http.delete<void>(`${this.timeApiUrl}/${id}`);
}
// 🔹 Project Management
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`);
  }

  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, project, {
      headers: this.jsonHeaders
    });
  }

  updateProject(id: number, project: Project): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}`, project, {
      headers: this.jsonHeaders
    });
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${id}`);
  }
   // 🔹 Account Management
  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.accountApiUrl);
  }

  createAccount(account: Account): Observable<Account> {
    return this.http.post<Account>(this.accountApiUrl, account, {
      headers: this.jsonHeaders
    });
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.accountApiUrl}/${id}`);
  }
  // 🔹 Phase Task Management
  getPhaseTasks(): Observable<PhaseTask[]> {
    return this.http.get<PhaseTask[]>(this.phaseTaskUrl);
  }

  getPhaseTaskById(id: number): Observable<PhaseTask> {
    return this.http.get<PhaseTask>(`${this.phaseTaskUrl}/${id}`);
  }

  createPhaseTask(task: PhaseTask): Observable<PhaseTask> {
    return this.http.post<PhaseTask>(this.phaseTaskUrl, task, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  updatePhaseTask(id: number, task: PhaseTask): Observable<PhaseTask> {
    return this.http.put<PhaseTask>(`${this.phaseTaskUrl}/${id}`, task, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  deletePhaseTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.phaseTaskUrl}/${id}`);
  }
}
