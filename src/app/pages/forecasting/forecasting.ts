import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService } from '../../services/financial-api.service';

@Component({
  selector: 'app-forecasting',
  imports: [CommonModule, Sidebar],
  templateUrl: './forecasting.html',
  styleUrl: './forecasting.css',
})
export class Forecasting implements OnInit {
  /** Retrieve logged‑in user ID from local storage */
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  // Summary cards
  projectedSpend = 0;
  estimatedSavings = 0;
  confidenceScore = 0;
  savingsRate = 0;

  // Data for the forecasting chart
  expenseHistory: number[] = [];      // last 6 months actual expenses
  expenseProjection: number[] = [];   // next 6 months forecasted expenses
  monthLabels: string[] = [];         // readable month labels for the X‑axis
  projectionMonthLabels: string[] = []; // readable month labels for the projections
  maxExpense = 0;                    // maximum value for chart scaling
  recentTransactions: any[] = [];    // last 5‑10 transactions for display

  constructor(private financialApi: FinancialApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  /** Re‑run the whole calculation – used by the "Recalibrate AI Model" button */
  recalibrate(): void {
    this.loadData();
  }

  /** Linear regression helper returning slope, intercept and R² */
  private linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
    // centre x values around the middle to improve numerical stability
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const x = i - xMean;
      const y = values[i] - yMean;
      num += x * y;
      den += x * x;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    // R² calculation
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = slope * i + intercept;
      ssTot += Math.pow(values[i] - yMean, 2);
      ssRes += Math.pow(values[i] - pred, 2);
    }
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return { slope, intercept, r2 };
  }

  /** Main driver – fetch dashboard totals and transaction history, then compute projections */
  private loadData(): void {
    // Load high‑level totals for the summary cards
    this.financialApi.getDashboard(this.userId).subscribe({
      next: (dash) => {
        const income = Number(dash?.totals?.income ?? 0);
        const expense = Number(dash?.totals?.expense ?? 0);
        const netBalance = income - expense;
        this.projectedSpend = Math.max(0, expense * 0.92);
        this.estimatedSavings = Math.max(0, netBalance + income * 0.12);
        // Base confidence (85 %) adjusted by cash‑flow health
        this.confidenceScore = income > 0 ? Math.min(99, 85 + Math.round((netBalance / income) * 10)) : 85;
        this.savingsRate = income > 0 ? (netBalance / income) * 100 : 0;
      },
      error: (err) => console.error('Failed to load dashboard for forecasting', err),
    });

    // Load transaction history to build a 6‑month expense timeline
    this.financialApi.getTransactions(this.userId).subscribe({
      next: (txs) => {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1); // six months ago
        const monthlyMap: Record<string, number> = {};
        for (let i = 0; i < 6; i++) {
          const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
          const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
          monthlyMap[key] = 0;
        }
        // Accumulate expenses per month
        txs.forEach((t) => {
          if (t.type !== 'expense') return;
          const dateStr = t.transaction_date ?? t.created_at;
          if (!dateStr) return;
          const d = new Date(dateStr);
          const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
          if (key in monthlyMap) {
            monthlyMap[key] += Number(t.amount ?? 0);
          }
        });
        const history: number[] = [];
        const labels: string[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        Object.keys(monthlyMap).forEach((k) => {
          const [yr, mo] = k.split('-').map(Number);
          labels.push(`${monthNames[mo - 1]} ${yr}`);
          history.push(monthlyMap[k]);
        });
        this.expenseHistory = history;
        this.monthLabels = labels;
        // Linear regression to forecast next six months
        const { slope, intercept, r2 } = this.linearRegression(history);
        const projection: number[] = [];
        for (let i = 0; i < 6; i++) {
          const idx = history.length + i;
          const pred = slope * idx + intercept;
          projection.push(Math.max(0, Math.round(pred)));
        }
        this.expenseProjection = projection;
        this.maxExpense = Math.max(...history, ...projection, 1);
        // Adjust confidence based on regression fit (R² up to +15 pts)
        const r2Boost = Math.round(r2 * 15);
        this.confidenceScore = Math.min(99, this.confidenceScore + r2Boost);
      },
      error: (err) => console.error('Failed to load transactions for forecasting', err),
    });
  }
}