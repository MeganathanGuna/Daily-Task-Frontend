import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  createPassword: string = '';
  confirmPassword: string = '';
  role: string = 'Employee';
  isPM: boolean = false;  // ✅ Toggle state
  alertMessage: string = '';
  alertClass: string = '';

  constructor(
    private router: Router,
    private userService: TaskService
  ) {}

  onSubmit() {
    if (this.createPassword !== this.confirmPassword) {
      this.alertMessage = 'Passwords do not match!';
      this.alertClass = 'alert-danger';
      return;
    }

    if (this.name && this.email && this.createPassword) {
      this.userService.registerUser(this.name, this.email, this.createPassword, this.role, this.isPM)
        .subscribe(
          () => {
            this.alertMessage = 'Registration successful!';
            this.alertClass = 'alert-success';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1500);
          },
          (error) => {
            console.error('Registration failed:', error);
            this.alertMessage = 'Registration failed. Try again!';
            this.alertClass = 'alert-danger';
          }
        );
    } else {
      this.alertMessage = 'Please fill in all fields.';
      this.alertClass = 'alert-warning';
    }
  }
}
