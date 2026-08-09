import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FinancialApiService, TransactionRecord } from '../../services/financial-api.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {
  get userId(): string {
    return localStorage.getItem('userId') || '';
  }

  totalIncome = 0;
  totalExpense = 0;
  netBalance = 0;
  savingsRate = 0;
  anomalyText = 'No unusual spending patterns detected in the last 30 days.';
  hasAnomaly = false;

  highestCategory = '';
  aiNote = 'Keep tracking your expenses to build better financial habits!';

  transactions: TransactionRecord[] = [];

  entertainmentAvg = 0;
  utilitiesAvg = 0;
  rentAvg = 0;
  groceriesAvg = 0;

  entChange = 0;
  utilChange = 0;
  rentChange = 0;
  grocChange = 0;

  categoriesPercentage = {
    rent: 0,
    groceries: 0,
    utilities: 0,
    entertainment: 0,
    travel: 0,
    other: 0,
  };
  
  categoriesOffset = {
    rent: 0,
    groceries: 0,
    utilities: 0,
    entertainment: 0,
    travel: 0,
    other: 0,
  };

  constructor(
    private financialApi: FinancialApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      dashboard: this.financialApi.getDashboard(this.userId),
      transactions: this.financialApi.getTransactions(this.userId),
    }).subscribe({
      next: ({ dashboard, transactions }) => {
        this.transactions = transactions;
        const salary = Number(dashboard?.profile?.monthly_salary || 0);

        // 1. Calculate Cash Flow Velocity for the last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const isLast30Days = (dateStr?: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
        };

        const income30d = transactions
          .filter(t => t.type === 'income' && isLast30Days(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const expense30d = transactions
          .filter(t => t.type === 'expense' && isLast30Days(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Inflow includes monthly salary
        this.totalIncome = salary + income30d;
        this.totalExpense = expense30d;
        this.netBalance = this.totalIncome - this.totalExpense;
        this.savingsRate = this.totalIncome > 0 ? (this.netBalance / this.totalIncome) * 100 : 0;

        // 2. Spending Segments (categorizing expenses for last month and previous month to calculate percentage change)
        let LYear = now.getFullYear();
        let LMonth = now.getMonth() - 1;
        if (LMonth < 0) {
          LMonth = 11;
          LYear--;
        }

        let PYear = now.getFullYear();
        let PMonth = now.getMonth() - 2;
        if (PMonth < 0) {
          PMonth = 11;
          PYear--;
        }

        const isMonthL = (dateStr?: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d.getFullYear() === LYear && d.getMonth() === LMonth;
        };

        const isMonthP = (dateStr?: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d.getFullYear() === PYear && d.getMonth() === PMonth;
        };

        let entL = 0, entP = 0;
        let utilL = 0, utilP = 0;
        let rentL = 0, rentP = 0;
        let grocL = 0, grocP = 0;
        let travelL = 0, travelP = 0;
        let otherL = 0, otherP = 0;

        let entAll = 0, utilAll = 0, rentAll = 0, grocAll = 0, travelAll = 0, otherAll = 0;

        for (const tx of transactions) {
          if (tx.type === 'expense') {
            const amount = Number(tx.amount || 0);
            const category = (tx.category || '').toLowerCase();
            const dateStr = tx.transaction_date || tx.created_at;

            let isEnt = category.includes('entertainment') || category.includes('shopping') || category.includes('leisure');
            let isUtil = category.includes('utilities') || category.includes('electricity') || category.includes('water') || category.includes('internet') || category.includes('gas');
            let isRent = category.includes('rent') || category.includes('housing');
            let isGroc = category.includes('groceries') || category.includes('pantry') || category.includes('food');
            let isTravel = category.includes('travel') || category.includes('transportation') || category.includes('fuel') || category.includes('cab') || category.includes('taxi');

            // All time sums for distribution
            if (isEnt) entAll += amount;
            else if (isUtil) utilAll += amount;
            else if (isRent) rentAll += amount;
            else if (isGroc) grocAll += amount;
            else if (isTravel) travelAll += amount;
            else otherAll += amount;

            // Monthly breakdown
            if (isMonthL(dateStr)) {
              if (isEnt) entL += amount;
              else if (isUtil) utilL += amount;
              else if (isRent) rentL += amount;
              else if (isGroc) grocL += amount;
              else if (isTravel) travelL += amount;
              else otherL += amount;
            } else if (isMonthP(dateStr)) {
              if (isEnt) entP += amount;
              else if (isUtil) utilP += amount;
              else if (isRent) rentP += amount;
              else if (isGroc) grocP += amount;
              else if (isTravel) travelP += amount;
              else otherP += amount;
            }
          }
        }

        this.entertainmentAvg = entL;
        this.utilitiesAvg = utilL;
        this.rentAvg = rentL;
        this.groceriesAvg = grocL;

        this.entChange = entP > 0 ? ((entL - entP) / entP) * 100 : 0;
        this.utilChange = utilP > 0 ? ((utilL - utilP) / utilP) * 100 : 0;
        this.rentChange = rentP > 0 ? ((rentL - rentP) / rentP) * 100 : 0;
        this.grocChange = grocP > 0 ? ((grocL - grocP) / grocP) * 100 : 0;

        // 3. Expense Distribution (using all-time expense categories)
        const totalExpenseAllTime = entAll + utilAll + rentAll + grocAll + travelAll + otherAll;
        const totalExp = totalExpenseAllTime || 1;

        this.categoriesPercentage = {
          rent: Math.round((rentAll / totalExp) * 100),
          groceries: Math.round((grocAll / totalExp) * 100),
          utilities: Math.round((utilAll / totalExp) * 100),
          entertainment: Math.round((entAll / totalExp) * 100),
          travel: Math.round((travelAll / totalExp) * 100),
          other: Math.round((otherAll / totalExp) * 100),
        };

        // Pie chart offsets
        let currentOffset = 0;
        this.categoriesOffset.rent = -currentOffset;
        currentOffset += this.categoriesPercentage.rent;

        this.categoriesOffset.groceries = -currentOffset;
        currentOffset += this.categoriesPercentage.groceries;

        this.categoriesOffset.utilities = -currentOffset;
        currentOffset += this.categoriesPercentage.utilities;

        this.categoriesOffset.entertainment = -currentOffset;
        currentOffset += this.categoriesPercentage.entertainment;

        this.categoriesOffset.travel = -currentOffset;
        currentOffset += this.categoriesPercentage.travel;

        this.categoriesOffset.other = -currentOffset;

        // 4. Anomaly Alert detection logic
        const nonRentExpenses = transactions.filter(t => t.type === 'expense' && !(t.category || '').toLowerCase().includes('rent'));
        const avgNonRent = nonRentExpenses.length > 0 
          ? nonRentExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0) / nonRentExpenses.length 
          : 0;

        const anomalyAlerts: string[] = [];

        // Single high-value expense anomaly (non-Rent)
        const highValueTx = nonRentExpenses.find(t => Number(t.amount || 0) > 10000 || (avgNonRent > 0 && Number(t.amount || 0) > avgNonRent * 3));
        if (highValueTx) {
          anomalyAlerts.push(`High-value purchase of ₹${highValueTx.amount} on ${highValueTx.source || highValueTx.category} detected.`);
        }

        // Monthly spending spike anomaly
        const LTotal = transactions
          .filter(t => t.type === 'expense' && isMonthL(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const PTotal = transactions
          .filter(t => t.type === 'expense' && isMonthP(t.transaction_date || t.created_at))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        if (PTotal > 0 && LTotal > PTotal * 1.3) {
          const increasePercent = Math.round(((LTotal - PTotal) / PTotal) * 100);
          anomalyAlerts.push(`Monthly spending increased by ${increasePercent}% compared to the previous month.`);
        }

        if (anomalyAlerts.length > 0) {
          this.anomalyText = anomalyAlerts.join(' ');
          this.hasAnomaly = true;
        } else {
          this.anomalyText = 'No unusual spending patterns detected in the last 30 days. Your cash flow is stable.';
          this.hasAnomaly = false;
        }

        // Calculate highest category for AI Spending Analysis note
        const categories = [
          { name: 'Housing & Rent', value: rentAll },
          { name: 'Groceries', value: grocAll },
          { name: 'Utilities', value: utilAll },
          { name: 'Entertainment', value: entAll },
          { name: 'Travel', value: travelAll },
        ];
        categories.sort((a, b) => b.value - a.value);
        const topCat = categories[0];
        
        if (topCat && topCat.value > 0) {
          this.highestCategory = topCat.name;
          if (topCat.name === 'Housing & Rent') {
            this.aiNote = 'Rent and housing represent your largest expenditure. Since this is fixed, focus on reducing flexible categories like Entertainment.';
          } else if (topCat.name === 'Groceries') {
            this.aiNote = 'Grocery expenses are your top spending category. Plan meals ahead and look for bulk purchase options to optimize this budget.';
          } else if (topCat.name === 'Utilities') {
            this.aiNote = 'Utilities are currently your largest category. Check for subscription services or energy consumption habits to cut costs.';
          } else if (topCat.name === 'Entertainment') {
            this.aiNote = 'Entertainment and shopping is your highest spending area. Consider setting a weekly limit for discretionary purchases.';
          } else if (topCat.name === 'Travel') {
            this.aiNote = 'Travel is your primary spending category. Look for daily commuting options or travel discounts to keep it minimal.';
          }
        }
      },
    });
  }
}

