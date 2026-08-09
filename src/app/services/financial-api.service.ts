import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface ProfileRecord {
  id?: number;
  user_id?: number;
  full_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  monthly_salary?: number;
  currency?: string;
  avatar_url?: string;
}

export interface TransactionRecord {
  id?: number;
  user_id?: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  transaction_date?: string;
  source?: string;
  recurring?: boolean;
  created_at?: string;
}

export interface DashboardResponse {
  profile: ProfileRecord | null;
  totals: {
    income: number;
    expense: number;
    netBalance: number;
  };
  recentTransactions: TransactionRecord[];
}

@Injectable({
  providedIn: 'root',
})
export class FinancialApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // Dashboard data for a specific user
  getDashboard(userId: number | string) {
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard/${userId}`);
  }

  // Profile CRUD
  getProfile(userId: number | string) {
    return this.http.get<ProfileRecord>(`${this.baseUrl}/profile/${userId}`);
  }

  saveProfile(userId: number | string, profile: Partial<ProfileRecord>) {
    return this.http.post<ProfileRecord>(`${this.baseUrl}/profile/${userId}`, profile);
  }

  // Authentication
  register(email: string, password: string, full_name?: string, phone?: string, city?: string, country?: string, monthly_salary?: number, tax_percent?: number) {
    return this.http.post<{ userId: number }>(`${this.baseUrl}/register`, { email, password, full_name, phone, city, country, monthly_salary, tax_percent });
  }

  login(email: string, password: string) {
    return this.http.post<{ userId: number }>(`${this.baseUrl}/login`, { email, password });
  }

  // Transactions
  addTransaction(userId: number | string, transaction: Partial<TransactionRecord>) {
    return this.http.post<TransactionRecord>(`${this.baseUrl}/transactions/${userId}`, transaction);
  }

  getTransactions(userId: number | string, type?: 'income' | 'expense') {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<TransactionRecord[]>(`${this.baseUrl}/transactions/${userId}`, { params });
  }

  // Goals
  getGoals(userId: number | string) {
    return this.http.get<any[]>(`${this.baseUrl}/goals/${userId}`);
  }

  // Save a new goal
  addGoal(userId: number | string, goal: { name: string; target: number; deadline?: string }) {
    return this.http.post<any>(`${this.baseUrl}/goals/${userId}`, goal);
  }
}
