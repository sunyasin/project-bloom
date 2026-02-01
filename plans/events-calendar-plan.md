# План изменений страницы /events

## Цель
Переработать страницу событий: убрать "Найдено: ...", заменить кнопку выбора дат на видимый календарь с отображением количества событий на каждом дне.

## Изменения

### 1. Убрать "Найдено: ..."
- Удалить элемент `<span className="text-sm text-muted-foreground">Найдено: {filteredEvents.length} из {events.length}</span>` (строки 150-152)

### 2. Заменить Popover на видимый календарь
- Удалить компонент `Popover` и `PopoverContent` (строки 105-141)
- Добавить видимый компонент `Calendar` с параметром `numberOfMonths={2}`
- Логика отображения месяцев:
  - По умолчанию: текущий месяц + следующий
  - Если последняя неделя месяца: текущий + следующий

### 3. Отображение количества событий на каждом дне
- Создать словарь `eventsCountByDate` с количеством событий на каждую дату
- Использовать `components.DayContent` для добавления цифры в угол ячейки
- Стилизация: маленькая цифра в правом нижнем углу ячейки дня

### 4. Клик по дню - выбор даты и показ событий
- Изменить `dateRange` на `selectedDate` (одиночная дата)
- При клике на день устанавливать `selectedDate`
- Под календарём показывать события за выбранный день
- Если дата не выбрана - показывать события текущего месяца (будущие)

### 5. Убрать фильтр по диапазону дат
- Удалить кнопку "Сбросить" (строки 143-148)
- Удалить логику `clearFilter` (строки 89-91)
- Упростить `filteredEvents` - фильтр только по выбранной дате

## Структура компонента после изменений

```tsx
// Состояние
const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

// События на выбранную дату или текущий месяц
const displayedEvents = useMemo(() => {
  if (selectedDate) {
    return events.filter(e => isSameDay(new Date(e.event_date), selectedDate));
  }
  // Показать все будущие события текущего месяца + следующего
  const now = new Date();
  const endOfNextMonth = addMonths(endOfMonth(now), 1);
  return events.filter(e => {
    const date = new Date(e.event_date);
    return date >= now && date <= endOfNextMonth;
  });
}, [events, selectedDate]);

// Количество событий по датам
const eventsCountByDate = useMemo(() => {
  const count: Record<string, number> = {};
  events.forEach(e => {
    if (e.event_date) {
      const dateKey = format(new Date(e.event_date), 'yyyy-MM-dd');
      count[dateKey] = (count[dateKey] || 0) + 1;
    }
  });
  return count;
}, [events]);

// Кастомный компонент дня с цифрой
const DayContent = ({ date }: { date: Date }) => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const count = eventsCountByDate[dateKey];
  
  return (
    <div className="relative">
      <span>{format(date, 'd')}</span>
      {count > 0 && (
        <span className="absolute -bottom-1 -right-1 text-[10px] font-bold text-primary">
          {count}
        </span>
      )}
    </div>
  );
};
```

## UI после изменений

```
┌─────────────────────────────────────────────────┐
│ Календарь событий                               │
│ Ярмарки, мастер-классы и встречи производителей │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐               │
│ │ Февраль 2026│  │ Март 2026   │               │
│ │ Пн Вт Ср ...│  │ Пн Вт Ср ...│               │
│ │  1  2  3  4 │  │  1  2  3  4 │               │
│ │  5  6  7  8 │  │  5  6  7  8 │               │
│ │  9 10 11 12 │  │  9 10 11 12 │               │
│ │ ...    2    │  │ ...         │               │
│ └─────────────┘  └─────────────┘               │
├─────────────────────────────────────────────────┤
│ События на 12 февраля 2026:                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ [карточка события 1]                         │ │
│ │ [карточка события 2]                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```
