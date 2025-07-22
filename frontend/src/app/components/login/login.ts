import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: false,
  styleUrls: ['./login.css'],
  templateUrl: './login.html'
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    if (!this.username || !this.password) {
      this.errorMessage = 'Please fill in both fields';
      return;
    }

    this.isLoading = true;

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/video-call']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Login failed: ' + (err.error?.message || 'Unknown error');
      }
    });
  }
}
