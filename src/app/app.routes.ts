import { Routes } from '@angular/router';
import { SITE } from './site.config';
import { PublicLayout } from './shared/public-layout';

export const routes: Routes = [
  {
    path: 'admin',
    data: { noindex: true },
    loadChildren: () => import('./admin/admin.routes'),
  },
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        title: `${SITE.name} | Skilled People, Quality Work`,
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'about',
        title: 'About us',
        data: { description: 'Meet Exodus Home Office: trained Social Media Managers, Video Editors, and Bookkeepers dedicated to quality work.' },
        loadComponent: () => import('./pages/about/about').then((m) => m.About),
      },
      {
        path: 'services',
        title: 'Services',
        data: { description: 'Social media management, video editing, and bookkeeping services from trained professionals.' },
        loadComponent: () => import('./pages/services/services').then((m) => m.Services),
      },
      {
        path: 'portfolio',
        title: 'Portfolio',
        data: { description: 'Social media content, videos, reels, and designs created by Exodus Home Office.' },
        loadComponent: () => import('./pages/portfolio/portfolio').then((m) => m.Portfolio),
      },
      {
        path: 'portfolio/:slug',
        title: 'Project',
        loadComponent: () => import('./pages/project-detail/project-detail').then((m) => m.ProjectDetail),
      },
      {
        path: 'contact',
        title: 'Contact us',
        data: { description: 'Tell us what your business needs. Send Exodus Home Office a message.' },
        loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
      },
      {
        path: '**',
        title: 'Page not found',
        data: { noindex: true },
        loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
