# Cron-based Notifications System

## Проблема
pg_net не может отправлять запросы к Supabase Edge Functions (сетевая изоляция).

## Решение: Supabase Cron + Database Functions

### Шаг 1: Откат старых миграций
```bash
supabase db push --file supabase/migrations/20260206160000_rollback_pg_net.sql
```

### Шаг 2: Создание таблицы для логов
```bash
supabase db push --file supabase/migrations/20260206170000_unified_notifications_log.sql
```

### Шаг 3: Включение pg_cron
```sql
-- SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Шаг 4: Запуск Cron задания (пока вручную)
```sql
SELECT cron.schedule('process-notifications', '* * * * *', $$
  UPDATE content_updates_log
  SET processed_at = NOW()
  WHERE notification_sent = FALSE
  AND created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 100;
$$);
```

### Шаг 5: Деплой Edge Function
```bash
supabase functions deploy process-notifications
```

### Шаг 6: Настройка расписания
Cron запускается каждую минуту, но НЕ может вызвать Edge Function напрямую.

**Варианты:**

#### А) Ручной вызов (для теста)
```bash
curl -X POST "https://bcoraetbfyxxpifavfpd.supabase.co/functions/v1/process-notifications"
```

#### Б) Внешний планировщик
- Use cron-job.org
- Use GitHub Actions scheduled
- Use any external cron service

#### В) Supabase Pro - Database Webhooks
- Включает интеграцию Cron + Edge Functions

## Миграции для применения:
1. `20260206160000_rollback_pg_net.sql` - откат
2. `20260206170000_unified_notifications_log.sql` - таблица + триггеры
3. `20260206180000_cron_notifications.sql` - cron функция

## Схема работы:
```
1. Пользователь создает товар
2. Срабатывает триггер log_product_change()
3. Запись в content_updates_log
4. Cron (каждую минуту) помечает записи
5. Внешний cron вызывает process-notifications Edge Function
6. Edge Function отправляет уведомления в Telegram
```

## Для работы без внешнего cron:
Добавьте в ProductEditor.js вызов Edge Function с обработкой ошибок:
```javascript
try {
  await fetch(`${SUPABASE_URL}/functions/v1/process-notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
} catch (e) {
  console.log("Уведомления будут отправлены позже");
}
```
