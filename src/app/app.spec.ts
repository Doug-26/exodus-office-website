import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the home page hero with the navbar and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Skilled people, quality work');
    expect(el.querySelector('app-navbar')).toBeTruthy();
    expect(el.querySelector('app-footer')?.textContent).toContain('Exodus Home Office');
  });

  it('shows the 404 page for unknown URLs', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/does-not-exist');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("We couldn't find that page");
  });
});
