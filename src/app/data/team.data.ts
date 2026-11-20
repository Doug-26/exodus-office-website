export interface TeamMember {
  name: string;
  role: string;
  /** Path under /public, e.g. 'team/maria-santos.jpg'. */
  photo: string;
}

/**
 * Team members shown on the About page.
 * New member without a photo yet? Use photo: 'team/placeholder.svg'.
 */
export const TEAM: TeamMember[] = [
  { name: 'Jacob Bisana', role: 'Social Media Manager', photo: 'team/jacob-bisana.png' },
  { name: 'Cristine Mae Bisana', role: 'Video Editor', photo: 'team/cristine-mae-bisana.jpg' },
  { name: 'Kenn Basa', role: 'Bookkeeper', photo: 'team/kenn-basa.jpg' },
  { name: 'JB Dela Cruz', role: 'Video Editor', photo: 'team/jb-dela-cruz.jpg' },
];
