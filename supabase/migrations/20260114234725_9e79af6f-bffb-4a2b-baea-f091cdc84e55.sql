-- Delete duplicate user_roles, keeping only the first one per user_id
DELETE FROM public.user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_roles
  ORDER BY user_id, created_at ASC
);

-- Add unique constraint on user_id to prevent duplicates
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);