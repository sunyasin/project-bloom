# Настройка автоматических уведомлений для Free плана

## Проблема
Вызов Edge Function из браузера блокируется антивирусами (Kaspersky, и др.)

## Решение для Free плана
Используем **pg_net** - расширение PostgreSQL для HTTP запросов из БД.

## Шаги настройки

### 1. Применить миграцию
```bash
cd supabase
supabase db push
```
или выполните SQL из файла `migrations/20260206160000_enable_pg_net_and_trigger.sql`

### 2. Проверить что pg_net включен

В Supabase Dashboard → **SQL Editor** выполните:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```
Должен вернуться результат. Если нет, расширение нужно включить через настройки.

### 3. Задеплоить Edge Function
```bash
cd supabase
supabase functions deploy notify-producer-update
```

### 4. Добавить переменную окружения

В Supabase Dashboard → **Settings** → **API** добавьте:
- `APP_BASE_URL` → `https://your-domain.com`

## Как это работает

```
Пользователь сохраняет товар
         ↓
PostgreSQL выполняет INSERT/UPDATE
         ↓
Срабатывает триггер products_webhook_trigger
         ↓
pg_net отправляет HTTP POST в Edge Function
         ↓
Edge Function отправляет уведомления в Telegram
```

## Проверка работы

1. Создайте или обновите товар через приложение
2. Проверьте логи Edge Function:
   **Functions** → **notify-producer-update** → **Logs**
3. В Telegram должны прийти уведомления подписчикам

## Troubleshooting

### Уведомления не приходят

1. **Проверьте что pg_net работает:**
   ```sql
   -- Должен вернуться INSERT без ошибки
   SELECT net.http_get(url := 'https://httpbin.org/get');
   ```

2. **Проверьте логи Edge Function** в Dashboard

3. **Проверьте что есть подписчики:**
   ```sql
   SELECT * FROM newsletter_subscriptions 
   WHERE send_profiles @> '["PRODUCER_ID"]'::jsonb;
   ```

4. **Проверьте что у подписчиков есть telegram_chat_id**

### Ошибка "producerId is required"
- Убедитесь что поле `producer_id` заполнено в товаре

## Если pg_net недоступен

Если `pg_net` не работает на вашем плане:

1. **Вариант A:** Используйте Supabase Realtime
   - Включите Realtime для таблицы `products`
   - Создайте отдельный сервис для прослушивания событий

2. **Вариант B:** Supabase Cron + polling
   - Создайте scheduled function
   - Опросите таблицу `product_updates_log` каждую минуту

3. **Вариант C:** Обновите на Pro план
   - Database Webhooks работают стабильнее
