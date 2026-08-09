import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService } from '../../services/financial-api.service';

interface Transaction {
  type: 'income' | 'expense';
  source: string;
  category: string;
  amount: number;
  date: string;
}

@Component({
  selector: 'app-expenses',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  showExpenseForm = false;
  showIncomeForm = false;

  salary = 0;
  salaryDraft = 0;

  transactions: Transaction[] = [];

  newExpense = {
    source: '',
    category: '',
    amount: 0,
    date: '',
  };

  newIncome = {
    source: '',
    category: '',
    amount: 0,
    date: '',
  };

  constructor(
    private financialApi: FinancialApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get totalExpenses(): number {
    return this.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalIncome(): number {
    const incomeTransactionsTotal = this.transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    return this.salary + incomeTransactionsTotal;
  }

  get netBalance(): number {
    return this.totalIncome - this.totalExpenses;
  }

  toggleExpenseForm(): void {
    this.showExpenseForm = !this.showExpenseForm;
  }

  toggleIncomeForm(): void {
    this.showIncomeForm = !this.showIncomeForm;
  }

  updateSalary(): void {
    const nextSalary = Number(this.salaryDraft);

    this.financialApi.saveProfile(this.userId, { monthly_salary: nextSalary }).subscribe({
      next: (profile) => {
        this.salary = Number(profile?.monthly_salary || 0);
        this.salaryDraft = this.salary;
      },
      error: () => {
        this.salary = nextSalary;
        this.salaryDraft = this.salary;
      },
    });
  }

  addExpense(): void {
    if (!this.newExpense.source || !this.newExpense.category || !this.newExpense.date || this.newExpense.amount <= 0) {
      return;
    }

    this.financialApi
      .addTransaction(this.userId, {
        type: 'expense',
        source: this.newExpense.source,
        category: this.newExpense.category,
        amount: Number(this.newExpense.amount),
        description: this.newExpense.source,
        transaction_date: this.newExpense.date,
      })
      .subscribe({
        next: () => {
          this.newExpense = {
            source: '',
            category: '',
            amount: 0,
            date: '',
          };
          this.showExpenseForm = false;
          this.loadData();
        },
      });
  }

  addIncome(): void {
    if (!this.newIncome.source || !this.newIncome.category || !this.newIncome.date || this.newIncome.amount <= 0) {
      return;
    }

    this.financialApi
      .addTransaction(this.userId, {
        type: 'income',
        source: this.newIncome.source,
        category: this.newIncome.category,
        amount: Number(this.newIncome.amount),
        description: this.newIncome.source,
        transaction_date: this.newIncome.date,
      })
      .subscribe({
        next: () => {
          this.newIncome = {
            source: '',
            category: '',
            amount: 0,
            date: '',
          };
          this.showIncomeForm = false;
          this.loadData();
        },
      });
  }

  private loadData(): void {
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      profile: this.financialApi.getProfile(this.userId),
      transactions: this.financialApi.getTransactions(this.userId),
    }).subscribe({
      next: ({ profile, transactions }) => {
        this.salary = Number(profile?.monthly_salary || 0);
        this.salaryDraft = this.salary;

        this.transactions = transactions
          .map((item) => ({
            type: item.type,
            source: item.source || item.description || item.category,
            category: item.category,
            amount: Number(item.amount || 0),
            date: this.formatDate(item.transaction_date || item.created_at),
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    });
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().split('T')[0];
  }
}
