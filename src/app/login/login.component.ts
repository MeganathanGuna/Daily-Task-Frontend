import { Component } from '@angular/core';
import { TaskService } from 'src/app/task.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email: string = '';
  password: string = '';
  alertMessage: string = '';
  alertClass: string = '';

  constructor(private router: Router, private userService: TaskService) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.showAlert('Please enter both email and password!', 'danger');
      return;
    }

    this.userService.loginUser(this.email, this.password).subscribe(
      (response) => {
        if (response && response.name) {
          localStorage.setItem('userName', response.name);
          localStorage.setItem('userRole', response.role); // ✅ This must match DB value exactly
          // ✅ Add this:
          localStorage.setItem('pm', response.pm ? 'true' : 'false');
        }
        console.log('userRole:', response.role);
        console.log('pm:',response.pm);

        this.showAlert('Login Successful!', 'success');
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      (error) => {
        this.showAlert('Login Failed. Please check your credentials!', 'danger');
        console.error('Login failed:', error);
      }
    );
  }

  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertClass = `alert alert-${type}`;
    setTimeout(() => {
      this.alertMessage = '';
    }, 3000);
  }

}
