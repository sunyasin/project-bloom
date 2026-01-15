// User roles enum matching database
export type AppRole = 'visitor' | 'client' | 'moderator' | 'news_editor' | 'super_admin';

export interface UserWithRole {
  id: string;
  email: string;
  roles: AppRole[];
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  visitor: 0,
  client: 1,
  moderator: 2,
  news_editor: 2,
  super_admin: 3,
};
