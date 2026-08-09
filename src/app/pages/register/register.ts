import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  standalone: true,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // Basic account fields
  email = '';
  password = '';
  fullName = '';
  // Optional profile fields
  phone = '';
  city = '';
  country = '';
  monthlySalary: number | null = null;

  constructor(private api: FinancialApiService, private router: Router) {}

  submit(): void {
    if (!this.email || !this.password) {
      return;
    }
    // Step 1: create user account
    const salary = Number(this.monthlySalary) || 0;
    this.api.register(this.email, this.password, this.fullName, this.phone, this.city, this.country, salary, undefined).subscribe({
      next: (res: any) => {
        const userId = res?.userId;
        if (userId) {
          // Step 2: store additional profile data (if any)
          const profile = {
            full_name: this.fullName,
            email: this.email,
            phone: this.phone || undefined,
            city: this.city || undefined,
            country: this.country || undefined,
            monthly_salary: salary,
          };
          this.api.saveProfile(userId, profile).subscribe({
            next: () => {
              // After profile saved, go back to login page
              this.router.navigate(['/login']);
            },
            error: err => console.error('Error saving profile', err),
          });
        }
      },
      error: err => console.error('Registration error', err),
    });
  }

  cancel(): void {
    // Return to login without creating an account
    this.router.navigate(['/login']);
  }
}
