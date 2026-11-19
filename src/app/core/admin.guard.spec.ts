import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard, loginGuard } from './admin.guard';
import { AuthService } from './auth.service';

function run(guard: typeof adminGuard, isAdmin: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { ready: () => Promise.resolve(), isAdmin: () => isAdmin } },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

describe('adminGuard', () => {
  it('lets admins in', async () => {
    expect(await run(adminGuard, true)).toBe(true);
  });

  it('sends everyone else to the login page', async () => {
    const result = await run(adminGuard, false);
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/admin/login');
  });
});

describe('loginGuard', () => {
  it('skips the login page for signed-in admins', async () => {
    expect((await run(loginGuard, true)).toString()).toBe('/admin/projects');
  });

  it('shows the login page otherwise', async () => {
    expect(await run(loginGuard, false)).toBe(true);
  });
});
