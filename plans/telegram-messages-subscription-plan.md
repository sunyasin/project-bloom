# План: Подписка на сообщения в Telegram

## Обзор задачи

Пользователь нажимает кнопку "Подписаться на уведомления" в окне сообщений → в БД сохраняется его `user_id` → при получении нового сообщения (где `to_id` = user_id подписчика) бот отправляет уведомление в Telegram.

**Бот:** `dol_biz_bot`

---

## Текущее состояние

### Таблица `newsletter_subscriptions`
```sql
- id uuid
- email text
- user_id text (для связи с пользователем)
- send_common boolean
- send_profiles uuid[]
- send_promotions boolean
- send_messages boolean (для уведомлений о сообщениях)
- telegram_chat_id text UNIQUE
- enabled boolean
```

### Таблица `messages`
```sql
- id serial (PK)
- from_id uuid (user_id отправителя)
- to_id uuid (user_id получателя)
- message text
- type string (chat, exchange, income, admin_status, from_admin)
- is_read boolean
- created_at timestamp
- notification_sent_status text (NULL, 'ok', 'error')
```

---

## Архитектура (Cron-based)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Пользователь    │     │     Cron        │     │  Telegram Бот    │
│  отправляет     │────▶│  каждые 5 мин    │────▶│  отправляет      │
│  сообщение      │     │                 │     │  уведомление     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Edge Function  │
                     │  process-       │
                     │  notifications  │
                     └─────────────────┘
```

---

## 1. Миграции

### 1.1 Основные миграции (уже применены)

- `20260211_add_messages_telegram_subscription.sql` - поля `user_id`, `send_messages`
- `20260213_fix_telegram_tokens.sql` - убран CHECK constraint, NOT NULL с email
- `20260215_add_cron_job.sql` - инструкции для cron

### 1.2 Применить миграции

```bash
supabase db push
```

---

## 2. Supabase Edge Functions

### 2.1 `telegram-webhook/index.ts` (обновлён)

Обрабатывает `/start TOKEN` от Telegram и создаёт подписку:

```typescript
if (subscriptionToken.type === "messages") {
  // Upsert по telegram_chat_id (обновляет существующую или создаёт новую)
  await supabase
    .from("newsletter_subscriptions")
    .upsert({
      user_id: subscriptionToken.user_id,
      email: subscriptionToken.email,
      telegram_chat_id: chatId.toString(),
      send_messages: true,
      enabled: true,
    }, { onConflict: "telegram_chat_id" });
}
```

### 2.2 `process-notifications/index.ts` (создан)

Обрабатывает сообщения и отправляет уведомления:

```typescript
// Запускается через cron каждые 5 минут
async function processMessages() {
  // 1. Найти сообщения с notification_sent_status IS NULL
  const { data: messages } = await supabase
    .from("messages")
    .select("id, from_id, to_id, message, type")
    .is("notification_sent_status", null)
    .limit(100);

  // 2. Для каждого сообщения найти подписку получателя
  const { data: subscription } = await supabase
    .from("newsletter_subscriptions")
    .select("id, telegram_chat_id")
    .eq("user_id", toId)
    .eq("send_messages", true)
    .eq("enabled", true)
    .single();

  // 3. Отправить Telegram уведомление
  await sendTelegramMessage(subscription.telegram_chat_id, text, link);

  // 4. Обновить notification_sent_status на "ok" или ошибку
}
```

### 2.3 Деплой функций

```bash
supabase functions deploy process-notifications
supabase functions deploy telegram-webhook
```

---

## 3. Cron настройка

### 3.1 Вариант A: Внешний cron (бесплатный план)

Использовать **cron-job.org**:

1. Зарегистрироваться на https://cron-job.org
2. Создать cron job:
   - **URL:** `https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=messages`
   - **Schedule:** `*/5 * * * *` (каждые 5 минут)
   - **Headers:** `x-api-key: YOUR_SUPAPI_SECRET_KEY`

### 3.2 Вариант B: Supabase pg_cron (Pro план)

```sql
-- В Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'process-notifications-cron',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=all',
      headers := '{"Content-Type": "application/json", "x-api-key": "YOUR_SUPAPI_SECRET_KEY"}'::jsonb
    );
  $$
);
```

### 3.3 Переменные окружения

Добавить в Supabase Dashboard:
- `SUPAPI_SECRET_KEY` - секретный ключ для авторизации cron

---

## 4. Frontend интеграция

### 4.1 Messenger.tsx (обновлён)

```typescript
// Создание токена подписки
const handleToggleMessageSubscription = async () => {
  // Проверить существующую подписку
  const { data: existingSub } = await supabase
    .from("newsletter_subscriptions")
    .select("id, send_messages, telegram_chat_id, email")
    .eq("user_id", currentUserId)
    .single();

  if (existingSub?.send_messages && existingSub?.telegram_chat_id) {
    // Уже подписан - отключаем
    await supabase
      .from("newsletter_subscriptions")
      .update({ send_messages: false })
      .eq("id", existingSub.id);
  } else if (existingSub && !existingSub.telegram_chat_id) {
    // Есть подписка, но нет Telegram - создать токен
    const token = crypto.randomUUID();
    await supabase.from("telegram_subscription_tokens").insert({
      user_id: currentUserId,
      email: existingSub.email,
      token,
      type: "messages",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    window.open(`https://t.me/dol_biz_bot?start=${token}`, "_blank");
  } else {
    // Нет подписки - создать
    const token = crypto.randomUUID();
    await supabase.from("telegram_subscription_tokens").insert({
      user_id: currentUserId,
      email: currentUserId,
      token,
      type: "messages",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    window.open(`https://t.me/dol_biz_bot?start=${token}`, "_blank");
  }
};
```

---

## 5. Схема работы

```
1. Пользователь открывает Messenger
2. Нажимает "Включить уведомления в Telegram"
3. Создаётся токен подписки (user_id, type='messages')
4. Открывается Telegram с ссылкой /start TOKEN
5. Пользователь нажимает /start в боте
6. webhook создаёт/обновляет запись в newsletter_subscriptions
7. Другой пользователь отправляет сообщение
8. Сообщение сохраняется с notification_sent_status = NULL
9. Cron (каждые 5 мин) вызывает process-notifications
10. Находится подписка получателя (send_messages = true)
11. Отправляется Telegram уведомление с именем отправителя
12. notification_sent_status обновляется на "ok"
```

---

## 6. Файлы

| Файл | Статус |
|------|--------|
| `supabase/migrations/20260213_fix_telegram_tokens.sql` | ✅ Создан |
| `supabase/migrations/20260215_add_cron_job.sql` | ✅ Создан |
| `supabase/migrations/20260215_remove_old_triggers.sql` | ✅ Создан |
| `supabase/functions/telegram-webhook/index.ts` | ✅ Обновлён |
| `supabase/functions/process-notifications/index.ts` | ✅ Создан |
| `src/pages/Messenger.tsx` | ✅ Обновлён |
| `supabase/CRON_NOTIFICATIONS_SETUP.md` | ✅ Создан |

---

## 7. Деплой

```bash
# 1. Применить миграции
supabase db push

# 2. Задеплоить функции
supabase functions deploy process-notifications
supabase functions deploy telegram-webhook

# 3. Настроить внешний cron (cron-job.org)
# URL: https://bcoraetbfyxxpifavfpd.functions.supabase.co/functions/v1/process-notifications?type=messages
# Schedule: */5 * * * *
# Header: x-api-key: YOUR_SECRET_KEY
```

---

## 8. Troubleshooting


### Ошибка "Unauthorized"
Добавить `SUPAPI_SECRET_KEY` в Supabase Dashboard и использовать в cron.

### Уведомления не приходят
1. Проверить что cron выполняется
2. Проверить логи: `supabase functions logs process-notifications`
3. Проверить подписку: `SELECT * FROM newsletter_subscriptions WHERE send_messages = true`
