import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TaskFormComponent } from './task-form/task-form.component';
import { TaskTableComponent } from './task-table/task-table.component';
import { ProjectComponent } from './project/project.component';
import { TimeFormComponent } from './time-form/time-form.component';
import { TimeTableComponent } from './time-table/time-table.component';
import { TimeNavbarComponent } from './time-navbar/time-navbar.component';
import { NgChartsModule } from 'ng2-charts';
import { ProjectFormComponent } from './project-form/project-form.component';
import { AccountFormComponent } from './account-form/account-form.component';
import { SpecializationComponent } from './specialization/specialization.component';
import { PhasetaskComponent } from './phasetask/phasetask.component';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgSelectModule } from '@ng-select/ng-select';

import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { OperationActivityComponent } from './operation-activity/operation-activity.component';
import { ProjectTaskComponent } from './project-task/project-task.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    TaskFormComponent,
    TaskTableComponent,
    ProjectComponent,
    TimeFormComponent,
    TimeTableComponent,
    TimeNavbarComponent,
    ProjectFormComponent,
    AccountFormComponent,
    SpecializationComponent,
    PhasetaskComponent,
    OperationActivityComponent,
    ProjectTaskComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgChartsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    BrowserAnimationsModule,
    NgSelectModule,
    MatSelectModule,
    MatCheckboxModule,
    MatOptionModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
