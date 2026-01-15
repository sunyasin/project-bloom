-- Удаляем уникальное ограничение, блокирующее множественные роли
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;