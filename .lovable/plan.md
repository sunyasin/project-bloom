

## Добавление VITE_SUPAPI_SECRET_KEY на фронтенд

### Предупреждение о безопасности

Любая переменная `VITE_*` попадает в собранный JS-бандл и видна всем пользователям в браузере. Это **не секрет** в классическом смысле. Если ключ должен оставаться конфиденциальным, лучше перейти на `supabase.functions.invoke()` (JWT-авторизация).

### Подход

Использовать тот же механизм, что уже работает для `VITE_SUPABASE_URL` — добавить fallback в `vite.config.ts` через `define`, читая из `process.env`.

### Шаг 1. Обновить `vite.config.ts`

Добавить третью строку в блок `define`:

```typescript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || "https://gchrpuqivmsdeiavhifi.supabase.co"),
  'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJ..."),
  'import.meta.env.VITE_SUPAPI_SECRET_KEY': JSON.stringify(process.env.VITE_SUPAPI_SECRET_KEY || ""),
},
```

Значение будет браться из переменной окружения `VITE_SUPAPI_SECRET_KEY`. Если она не задана — пустая строка.

### Шаг 2. Задать значение в Cloud Secrets

Добавить секрет `VITE_SUPAPI_SECRET_KEY` в Cloud (если ещё не добавлен). Этот секрет станет доступен как переменная окружения при сборке.

### Шаг 3. Исправить ошибку сборки в `send-telegram-notification/index.ts`

Заменить `serve(...)` на `Deno.serve(...)` — текущая версия использует устаревший импорт, который вызывает TS2304.

### Результат

- Ключ читается из Cloud Secrets при сборке — **не хардкодится** в репозитории
- Fallback на пустую строку, если секрет не задан
- Файл `.env` не редактируется (он авто-генерируемый)

### Технические детали

Файлы для изменения:
- `vite.config.ts` — добавить define для `VITE_SUPAPI_SECRET_KEY`
- `supabase/functions/send-telegram-notification/index.ts` — заменить `serve` на `Deno.serve`

