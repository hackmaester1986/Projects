import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone:false,
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  @Input() showModal: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  username: string = '';
  errorMessage: string = '';
  password: string = '';
  isLoading = false;

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Username and Password required';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const user = {
      username: this.username,
      password: this.password,
    };

    this.authService.register(user).subscribe({
      next: () => {
        this.isLoading = false;
        alert('Registration successful!');
        this.close();
      },
      error: (err) => {
        this.isLoading = false;
        alert('Error: ' + err.error.message || 'Registration failed.');
      },
    });
  }

  close() {
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.showModal = false;
    this.closeModal.emit();
  }
}