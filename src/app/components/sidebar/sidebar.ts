import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, CommonModule],
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  private userId = '';
  fullName = '';
  avatarUrl = '';
  isOpen = false;

  toggle(): void { this.isOpen = !this.isOpen; }
  close(): void { this.isOpen = false; }

  constructor(private financialApi: FinancialApiService, private router: Router) {
    this.userId = localStorage.getItem('userId') || '';
  }

  logout(): void {
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.financialApi.getProfile(this.userId).subscribe({
      next: (profile) => {
        this.fullName = profile?.full_name || '';
        this.avatarUrl = profile?.avatar_url || '';
      },
    });
  }
}
