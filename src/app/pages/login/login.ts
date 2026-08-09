import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private api: FinancialApiService, private router: Router) {}

  login(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.api.login(this.email, this.password).subscribe({
      next: (res: any) => {
        if (res?.userId) {
          localStorage.setItem('userId', res.userId.toString());
          this.router.navigate(['/dashboard']);
        }
      },
      error: err => {
        const message = err?.error?.error || 'Invalid email or password.';
        this.errorMessage = message;
      },
    });
  }

}


