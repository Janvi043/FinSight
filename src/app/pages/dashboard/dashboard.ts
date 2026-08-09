import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  welcomeName = 'Jane';
  balance = 0;
  spending = 0;
  savings = 0;
  portfolioYield = 14.2;
  savingsGoal = 0;
  savingsAchieved = 0;
  recentTransactions: any[] = [];

  weeklyExpenses = [
    { day: 'Mon', amount: 0, heightPercent: 10 },
    { day: 'Tue', amount: 0, heightPercent: 10 },
    { day: 'Wed', amount: 0, heightPercent: 10 },
    { day: 'Thu', amount: 0, heightPercent: 10 },
    { day: 'Fri', amount: 0, heightPercent: 10 },
    { day: 'Sat', amount: 0, heightPercent: 10 },
    { day: 'Sun', amount: 0, heightPercent: 10 }
  ];

  // Savings Goals fetched from backend
  savingsGoals: any[] = [];

  // Map for color classes (optional)
  private goalColors = ['bg-emerald-500', 'bg-blue-500', 'bg-cyan-400', 'bg-purple-500', 'bg-amber-500'];

  private loadGoals(): void {
    this.financialApi.getGoals(this.userId).subscribe({
      next: (goals) => {
        this.savingsGoals = goals.map((g: any, idx: number) => {
          const achieved = g.achieved || 0;
          const target = g.target || 0;
          const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
          return {
            name: g.name,
            target,
            achieved,
            percentage,
            colorClass: this.goalColors[idx % this.goalColors.length]
          };
        });
        // Allocate current savings proportionally to each goal
        this.savingsGoal = this.savingsGoals.reduce((sum, g) => sum + g.target, 0);
        if (this.savingsGoal > 0) {
          const totalSavings = this.savings;
          this.savingsGoals.forEach(goal => {
            goal.achieved = Math.round(totalSavings * (goal.target / this.savingsGoal));
            goal.percentage = goal.target > 0 ? Math.round((goal.achieved / goal.target) * 100) : 0;
          });
          this.savingsAchieved = Math.min(100, Math.max(0, (totalSavings / this.savingsGoal) * 100));
        } else {
          this.savingsAchieved = 0;
        }
      },
      error: () => {
        this.savingsGoals = [];
      }
    });
  }

  constructor(private financialApi: FinancialApiService, public router: Router) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      dashboard: this.financialApi.getDashboard(this.userId),
      transactions: this.financialApi.getTransactions(this.userId)
    }).subscribe({
      next: ({ dashboard, transactions }) => {
        const salary = Number(dashboard?.profile?.monthly_salary || 0);

        if (dashboard?.profile?.full_name) {
          const names = dashboard.profile.full_name.split(' ');
          this.welcomeName = names[0];
        } else {
          this.welcomeName = 'Jane';
        }

        // 1. Total Balance: net balance of all-time transactions (including salary)
        const allIncomeTransactions = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const allExpenseTransactions = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalIncomeAllTime = salary + allIncomeTransactions;
        this.balance = totalIncomeAllTime - allExpenseTransactions;

        // 2. Total spending for last month: sum of all expenses in last month
        const now = new Date();
        let lastMonthYear = now.getFullYear();
        let lastMonth = now.getMonth() - 1;
        if (lastMonth < 0) {
          lastMonth = 11;
          lastMonthYear--;
        }

        const isLastMonthTx = (dateStr?: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
        };

        const lastMonthExpenses = transactions
          .filter(t => t.type === 'expense' && isLastMonthTx(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        this.spending = lastMonthExpenses;

        // 3. Total savings: balance calculated after last month's income minus expenses
        const lastMonthIncomeTransactions = transactions
          .filter(t => t.type === 'income' && isLastMonthTx(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const lastMonthTotalIncome = salary + lastMonthIncomeTransactions;
        this.savings = Math.max(0, lastMonthTotalIncome - lastMonthExpenses);

        // 4. Portfolio yield: custom formula representing portfolio performance based on savings rate
        const savingsRate = totalIncomeAllTime > 0 ? (this.balance / totalIncomeAllTime) * 100 : 0;
        const yieldPercent = Math.max(0, savingsRate * 0.15); // e.g. 15% of the overall savings rate
        this.portfolioYield = Number(yieldPercent.toFixed(1));

        // 5. Recent transactions (last 5-10 transactions)
        this.recentTransactions = (dashboard?.recentTransactions || []).slice(0, 10);

        // 6. Expense Analytics Graph (expenses by day of the week)
        const daySums = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
        for (const tx of transactions) {
          if (tx.type === 'expense') {
            const dateStr = tx.transaction_date || tx.created_at;
            if (dateStr) {
              const date = new Date(dateStr);
              const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
              const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              daySums[index] += Number(tx.amount || 0);
            }
          }
        }

        const maxVal = Math.max(...daySums, 1);
        for (let i = 0; i < 7; i++) {
          this.weeklyExpenses[i].amount = daySums[i];
          this.weeklyExpenses[i].heightPercent = Math.max(10, Math.round((daySums[i] / maxVal) * 100));
        }

        // Calculate dynamic savings goals based on the savings balance
        // Removed static allocation; fetch goals from backend
        this.loadGoals();
      },
      error: () => {
        this.balance = 0;
        this.spending = 0;
        this.savings = 0;
        this.recentTransactions = [];
        this.welcomeName = 'Jane';
      },
    });
  }
}

