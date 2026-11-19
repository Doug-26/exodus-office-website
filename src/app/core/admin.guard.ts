import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Only signed-in admins may enter the admin area. */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  return auth.isAdmin() ? true : router.createUrlTree(['/admin/login']);
};

/** Skip the login page when already signed in as an admin. */
export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  return auth.isAdmin() ? router.createUrlTree(['/admin/projects']) : true;
};
