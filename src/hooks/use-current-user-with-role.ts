import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, UserWithRole } from '@/types/roles';

interface UseCurrentUserWithRoleResult {
  user: UserWithRole | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Helper hook to get current authenticated user with their role
 * Uses Supabase Auth session and queries user_roles table
 */
export function useCurrentUserWithRole(): UseCurrentUserWithRoleResult {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserWithRole = async (userId: string, email: string) => {
      try {
        const { data, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleError) throw roleError;

        if (isMounted) {
          setUser({
            id: userId,
            email,
            role: (data?.role as AppRole) || null,
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Defer Supabase call to avoid deadlock
          setTimeout(() => {
            fetchUserWithRole(session.user.id, session.user.email || '');
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserWithRole(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}

/**
 * Server-side helper function to get current user with role
 * Can be used in edge functions or server contexts
 */
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    role: (data?.role as AppRole) || null,
  };
}
