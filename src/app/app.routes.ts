import { Routes } from '@angular/router';

import { Landing } from './pages/landing/landing';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Expenses } from './pages/expenses/expenses';
import { Forecasting } from './pages/forecasting/forecasting';
import { Analytics } from './pages/analytics/analytics';
import { Reports } from './pages/reports/reports';
import { Settings } from './pages/settings/settings';
import { AddGoal } from './pages/add-goal/add-goal';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'landing', component: Landing },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'expenses', component: Expenses },
  { path: 'forecasting', component: Forecasting },
  { path: 'analytics', component: Analytics },
  { path: 'reports', component: Reports },
  { path: 'settings', component: Settings },
  { path: 'add-goal', component: AddGoal },
];