# Cron-based Notifications System для Telegram уведомлений о сообщениях

## Обзор

Система использует внешний cron сервис для регулярной проверки новых сообщений и отправки Telegram уведомлений подписчикам.

## Схема работы

```
1. Пользователь отправляет сообщение в приложении
2. Сообщение сохраняется в таблице messages
3. Поле notification_sent_status = NULL
4. Cron (каждые 5 минут) вызывает process-notifications Edge Function
5. Edge Function ищет сообщения с notification_sent_status IS NULL
6. Для каждого сообщения ищется подписка получателя (send_messages = true)
7. Отправляется Telegram уведомление
8. Обновляется notification_sent_status на "ok" или ошибку
```

## Настройка

### Шаг 1: Добавить переменную окружения SUPAPI_SECRET_KEY

В Supabase Dashboard:
1. Перейдите в **Project Settings** → **API**
2. Найдите **Secret Keys** или **Environment Variables**
3. Добавьте новую переменную:
   - **Name:** `SUPAPI_SECRET_KEY`
   - **Value:** сгенерируйте случайную строку (например: `cron-secret-key-2024`)
4. Нажмите **Save**

### Шаг 2: Применить миграции

```bash
cd supabase
supabase db push --file supabase/migrations/20260215_add_cron_job.sql
```

### Шаг 3: Задеплоить Edge Function

```bash
supabase functions deploy process-notifications
```

### Шаг 4: Настроить внешний cron

Используйте бесплатный сервис **cron-job.org**:

1. Перейдите на https://cron-job.org
2. Зарегистрируйтесь и войдите
3. Нажмите **Create Cron Job**
4. Заполните:

| Параметр | Значение |
|----------|----------|
| **URL** | `https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=messages` |
| **Schedule** | `*/5 * * * *` (каждые 5 минут) |
| **HTTP Method** | POST |
| **Content-Type** | application/json |
| **HTTP Basic Auth** | Не нужно |
| **Additional Headers** | `x-api-key: YOUR_SECRET_KEY` (где YOUR_SECRET_KEY - значение SUPAPI_SECRET_KEY) |

5. Нажмите **Create**

### Шаг 5: Проверка

1. Отправьте тестовое сообщение через приложение
2. Подождите 5 минут (или нажмите **Execute Now** в cron-job.org)
3. Проверьте логи Edge Function:
   ```bash
   supabase functions logs process-notifications
   ```

## Проверка статуса

### Проверить неотправленные сообщения:

```sql
SELECT id, from_id, to_id, message, notification_sent_status
FROM messages
WHERE notification_sent_status IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Проверить подписки:

```sql
SELECT id, user_id, telegram_chat_id, send_messages, enabled
FROM newsletter_subscriptions
WHERE send_messages = true AND enabled = true;
```

## Troubleshooting

### Ошибка "Unauthorized: missing or invalid Authorization header"

1. Проверьте что `SUPAPI_SECRET_KEY` добавлен в Supabase Dashboard
2. Проверьте что заголовок `x-api-key` добавлен в cron-job.org
3. Перезадеплоите Edge Function после добавления переменной:
   ```bash
   supabase functions deploy process-notifications --no-verify-jwt
   ```

### Уведомления не приходят

1. Проверьте что cron-job.org выполняется успешно (зеленая галочка)
2. Проверьте логи Edge Function
3. Проверьте что у получателя есть подписка с `send_messages = true`
4. Проверьте что у подписки есть `telegram_chat_id`

### Сообщения не отправляются повторно

Поле `notification_sent_status` уже заполнено. Сбросьте для теста:
```sql
UPDATE messages
SET notification_sent_status = NULL
WHERE id = 'message_id';
```

## Файлы системы

- **Edge Function:** `supabase/functions/process-notifications/index.ts`
- **Миграция:** `supabase/migrations/20260215_add_cron_job.sql`
- **Webhook для Telegram:** `supabase/functions/telegram-webhook/index.ts`
