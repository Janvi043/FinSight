import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-add-goal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-goal.html',
  styleUrl: './add-goal.css'
})
export class AddGoal {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  name = '';
  target: number | null = null;
  deadline = '';

  constructor(private financialApi: FinancialApiService, private router: Router) {}

  submit() {
    if (!this.name || this.target === null) {
      return;
    }
    const payload = {
      name: this.name,
      target: this.target,
      deadline: this.deadline || undefined
    };
    this.financialApi.addGoal(this.userId, payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => console.error('Failed to add goal', err)
    });
  }
}
