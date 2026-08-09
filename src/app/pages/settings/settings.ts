import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  profile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    currency: 'INR',
    avatarUrl: '',
  };

  constructor(private financialApi: FinancialApiService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  saveProfile(): void {
    const payload = {
      full_name: `${this.profile.firstName} ${this.profile.lastName}`.trim(),
      email: this.profile.email,
      phone: this.profile.phone,
      city: this.profile.city,
      country: this.profile.country,
      currency: this.profile.currency,
      avatar_url: this.profile.avatarUrl,
    };

    this.financialApi.saveProfile(this.userId, payload).subscribe();
  }

  private loadProfile(): void {
    this.financialApi.getProfile(this.userId).subscribe({
      next: (data) => {
        const fullName = data?.full_name || '';
        const [firstName = '', lastName = ''] = fullName.split(' ');

        this.profile = {
          firstName,
          lastName,
          email: data?.email || '',
          phone: data?.phone || '',
          city: data?.city || '',
          country: data?.country || '',
          currency: data?.currency || 'INR',
          avatarUrl: data?.avatar_url || 'https://ui-avatars.com/api/?name=Jane+Doe&background=0D8ABC&color=fff',
        };
      },
    });
  }
}