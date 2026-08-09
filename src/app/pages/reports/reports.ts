import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, Sidebar],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  totalIncome = 0;
  totalExpense = 0;
  netProfitMargin = 0;
  netSavings = 0;
  savingsGoal = 40000;
  savingsAchieved = 0;

  // Trend data for expense chart
  expenseTrend: number[] = [];
  trendMonthLabels: string[] = [];
  maxExpense = 0;

  // Category breakdown for budget vs actual
  categoryBreakdown: Array<{ category: string; budget: number; actual: number; variance: number; status: string; icon: string; iconColorClass: string; bgColorClass: string; }> = [];

  constructor(private financialApi: FinancialApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.financialApi.getDashboard(this.userId).subscribe({
      next: (response) => {
        const income = Number(response?.totals?.income || 0);
        const expense = Number(response?.totals?.expense || 0);
        const netBalance = income - expense;

        this.totalIncome = income;
        this.totalExpense = expense;
        this.netSavings = netBalance;
        this.netProfitMargin = income > 0 ? (netBalance / income) * 100 : 0;
        this.savingsAchieved = Math.min(100, Math.max(0, (netBalance / this.savingsGoal) * 100));
      },
    });

    this.financialApi.getTransactions(this.userId).subscribe({
      next: (transactions) => {
        const budgetMap: Record<string, number> = {
          'Rent': 15000,
          'Groceries': 5000,
          'Utilities': 3000,
          'Entertainment': 2000,
          'Travel': 3000,
          'Healthcare': 2000,
        };

        const icons: Record<string, string> = {
          'Rent': 'home',
          'Groceries': 'shopping-cart',
          'Utilities': 'lightning-bolt',
          'Entertainment': 'play',
          'Travel': 'truck',
          'Healthcare': 'heart',
        };

        const iconColorClasses: Record<string, string> = {
          'Rent': 'text-indigo-600',
          'Groceries': 'text-amber-600',
          'Utilities': 'text-cyan-600',
          'Entertainment': 'text-purple-600',
          'Travel': 'text-blue-600',
          'Healthcare': 'text-red-600',
        };

        const bgColorClasses: Record<string, string> = {
          'Rent': 'bg-indigo-50',
          'Groceries': 'bg-amber-50',
          'Utilities': 'bg-cyan-50',
          'Entertainment': 'bg-purple-50',
          'Travel': 'bg-blue-50',
          'Healthcare': 'bg-red-50',
        };

        // Group expenses by category
        const actualMap: Record<string, number> = {};
        for (const tx of transactions) {
          if (tx.type === 'expense') {
            actualMap[tx.category] = (actualMap[tx.category] || 0) + Number(tx.amount || 0);
          }
        }

        // Generate breakdown list
        this.categoryBreakdown = Object.keys(budgetMap).map(cat => {
          const budget = budgetMap[cat];
          const actual = actualMap[cat] || 0;
          const variance = actual - budget;
          let status = 'On Target';
          if (variance > 0) {
            status = 'Over Budget';
          } else if (variance < 0) {
            status = 'Under Budget';
          }
          return {
            category: cat,
            budget,
            actual,
            variance,
            status,
            icon: icons[cat] || 'tag',
            iconColorClass: iconColorClasses[cat] || 'text-slate-600',
            bgColorClass: bgColorClasses[cat] || 'bg-slate-50',
          };
        });
        // Expense trend for last 6 months
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyMap: Record<string, number> = {};
        for (let i = 0; i < 6; i++) {
          const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
          const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
          monthlyMap[key] = 0;
        }
        transactions.forEach(t => {
          if (t.type !== 'expense') return;
          const dateStr = t.transaction_date ?? t.created_at;
          if (!dateStr) return;
          const d = new Date(dateStr);
          const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
          if (key in monthlyMap) {
            monthlyMap[key] += Number(t.amount ?? 0);
          }
        });
        const trend: number[] = [];
        const labels: string[] = [];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        Object.keys(monthlyMap).forEach(k => {
          const [yr, mo] = k.split('-').map(Number);
          labels.push(`${monthNames[mo - 1]} ${yr}`);
          trend.push(monthlyMap[k]);
        });
        this.expenseTrend = trend;
        this.trendMonthLabels = labels;
        this.maxExpense = Math.max(...trend, 1);
      }
    });
  }
}