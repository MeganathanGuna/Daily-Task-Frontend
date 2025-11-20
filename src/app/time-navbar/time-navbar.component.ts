import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-time-navbar',
  templateUrl: './time-navbar.component.html',
  styleUrls: ['./time-navbar.component.css']
})
export class TimeNavbarComponent {

   @Input() userName: string = '';

  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/']);
  }

  goToAddTime() {
    this.router.navigate(['/add-time']);
  }

  goToAllTime() {
    this.router.navigate(['/all-time']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
