export interface ServiceInfo {
  id: 'social-media' | 'video-editing' | 'bookkeeping';
  title: string;
  icon: string;
  tagline: string;
  summary: string;
  deliverables: string[];
}

/** The three core services, taken from the office description. */
export const SERVICES: ServiceInfo[] = [
  {
    id: 'social-media',
    title: 'Social Media Management',
    icon: 'bi-megaphone',
    tagline: 'Plan · Create · Engage',
    summary:
      'Consistent, on-brand social media that builds your audience and keeps your followers engaged while you run your business.',
    deliverables: [
      'Content planning',
      'Social media strategy',
      'Content creation',
      'Post scheduling',
      'Audience engagement',
    ],
  },
  {
    id: 'video-editing',
    title: 'Video Editing',
    icon: 'bi-camera-reels',
    tagline: 'Reels · Promos · Long-form',
    summary:
      'Engaging videos edited to hold attention and tell your story, from quick reels to long-form content.',
    deliverables: [
      'Short-form videos',
      'Long-form videos',
      'Promotional content',
      'Reels',
      'Other creative video projects',
    ],
  },
  {
    id: 'bookkeeping',
    title: 'Bookkeeping',
    icon: 'bi-calculator',
    tagline: 'Records · Tracking · Expenses',
    summary:
      'Organized, accurate financial records so you always know where your business stands, without the paperwork stress.',
    deliverables: [
      'Organized financial records',
      'Transaction tracking',
      'Expense management',
      'Bookkeeping support',
    ],
  },
];

export const VALUES = [
  {
    icon: 'bi-briefcase',
    title: 'Professionalism',
    text: 'Trained specialists who treat your business with the care and discretion it deserves.',
  },
  {
    icon: 'bi-gem',
    title: 'Quality',
    text: 'Attention to detail in every post, edit, and entry, because the small things matter.',
  },
  {
    icon: 'bi-hand-thumbs-up',
    title: 'Commitment',
    text: 'We complete every project within the agreed deadline. Your time and trust come first.',
  },
  {
    icon: 'bi-chat-dots',
    title: 'Clear communication',
    text: 'You always know what we are working on, what is next, and when it will be done.',
  },
];
