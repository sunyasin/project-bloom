import { ReactNode } from 'react';
import { useCurrentUserWithRole } from '@/hooks/use-current-user-with-role';
import type { AppRole } from '@/types/roles';

interface RoleGuardProps {
  /** Allowed roles for accessing the content */
  allowedRoles: AppRole[];
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback when user lacks permission */
  fallback?: ReactNode;
  /** Optional loading state */
  loadingFallback?: ReactNode;
}

/**
 * RoleGuard component - protects content based on user roles
 * Does not handle redirects, just renders content or fallback
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingFallback,
}: RoleGuardProps) {
  const { user, loading } = useCurrentUserWithRole();

  // Show loading state
  if (loading) {
    return (
      <>
        {loadingFallback || (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-muted-foreground">Загрузка...</div>
          </div>
        )}
      </>
    );
  }

  // Check if user has required role
  const hasPermission = user?.role && allowedRoles.includes(user.role);

  if (!hasPermission) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-foreground">Доступ запрещён</h1>
              <p className="text-muted-foreground">
                У вас нет прав для просмотра этой страницы.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
