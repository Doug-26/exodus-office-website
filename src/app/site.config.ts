/**
 * Business details shown across the site (navbar, footer, contact page, SEO).
 * Edit these in one place. Empty values are hidden automatically.
 */
export interface SocialLink {
  label: string;
  icon: string;
  url: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  location: string;
  socials: SocialLink[];
}

export const SITE: SiteConfig = {
  name: 'Exodus Home Office',
  tagline: 'Skilled People, Quality Work, and Services You Can Trust.',
  description:
    'Exodus Home Office is a team of trained Social Media Managers, Video Editors, and Bookkeepers providing reliable, high-quality virtual services for businesses.',
  // TODO: replace with the office's real contact details.
  email: '',
  phone: '',
  location: 'Remote team, serving clients worldwide',
  socials: [
    { label: 'Facebook', icon: 'bi-facebook', url: '' },
    { label: 'Instagram', icon: 'bi-instagram', url: '' },
    { label: 'TikTok', icon: 'bi-tiktok', url: '' },
    { label: 'LinkedIn', icon: 'bi-linkedin', url: '' },
  ],
};

export const ACTIVE_SOCIALS: SocialLink[] = SITE.socials.filter((s) => s.url);
