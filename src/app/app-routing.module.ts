import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './auth/auth.guard';
import { ProjectComponent } from './project/project.component';
import { TimeFormComponent } from './time-form/time-form.component';
import { TimeTableComponent } from './time-table/time-table.component';
import { TaskFormComponent } from './task-form/task-form.component';
import { SpecializationComponent } from './specialization/specialization.component';
import { PhasetaskComponent } from 'src/app/phasetask/phasetask.component';
import { TaskTableComponent } from './task-table/task-table.component';
import { OperationActivityComponent } from './operation-activity/operation-activity.component';
import { ProjectTaskComponent } from './project-task/project-task.component';


const routes: Routes = [
  { path: '', component: ProjectComponent }, // ✅ Project selection page (default)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }, 
  { path: 'tasktable', component: TaskTableComponent, canActivate: [AuthGuard]}, // ✅ protected route
  { path: 'add-time', component: TimeFormComponent, canActivate: [AuthGuard] },
  { path: 'all-time', component: TimeTableComponent, canActivate: [AuthGuard] },
  { path: 'specialization', component: SpecializationComponent },
  { path: 'phasetask', component: PhasetaskComponent },
  { path: 'taskform', component: TaskFormComponent},
  { path: 'project-tasks/:projectName', component: ProjectTaskComponent },
  { 
    path: 'operation-activity', 
    component: OperationActivityComponent,
    canActivate: [AuthGuard] 
  },
  { path: '**', redirectTo: 'login' } // ✅ fallback
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
