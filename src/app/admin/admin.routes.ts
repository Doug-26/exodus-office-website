import { Routes } from '@angular/router';
import { adminGuard, loginGuard } from '../core/admin.guard';

export default [
  {
    path: 'login',
    canActivate: [loginGuard],
    title: 'Admin sign in',
    loadComponent: () => import('./login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        title: 'Projects · Admin',
        loadComponent: () => import('./project-list').then((m) => m.ProjectList),
      },
      {
        path: 'projects/new',
        title: 'New project · Admin',
        loadComponent: () => import('./project-form/project-form').then((m) => m.ProjectForm),
      },
      {
        path: 'projects/:id',
        title: 'Edit project · Admin',
        loadComponent: () => import('./project-form/project-form').then((m) => m.ProjectForm),
      },
      {
        path: 'inquiries',
        title: 'Inquiries · Admin',
        loadComponent: () => import('./inquiries').then((m) => m.Inquiries),
      },
    ],
  },
] satisfies Routes;
