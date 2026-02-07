-- Исправление триггера log_promotion_change для использования owner_id
-- В таблице promotions используется owner_id, а не producer_id

-- Обновляем функцию триггера
CREATE OR REPLACE FUNCTION log_promotion_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_updates_log (entity_type, entity_id, producer_id, action, new_data)
  VALUES (
    'promotion',
    COALESCE(NEW.id, OLD.id),
    NEW.owner_id, -- акции привязаны к производителю (owner_id)
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Пересоздаем триггер
DROP TRIGGER IF EXISTS log_promotion_insert ON public.promotions;
CREATE TRIGGER log_promotion_insert
  AFTER INSERT ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION log_promotion_change();

COMMENT ON FUNCTION log_promotion_change() IS 'Логирует акции производителей (использует owner_id)';
