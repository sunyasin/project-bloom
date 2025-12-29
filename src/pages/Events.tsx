import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar, MapPin, Clock } from "lucide-react";

// Mock events data
const mockEvents = [
  {
    id: "1",
    title: "Фермерский рынок выходного дня",
    date: "4 января 2026",
    time: "09:00 - 15:00",
    location: "Центральная площадь",
    type: "Ярмарка",
  },
  {
    id: "2",
    title: "Мастер-класс по сыроварению",
    date: "10 января 2026",
    time: "14:00 - 17:00",
    location: "Ферма Петровых",
    type: "Мастер-класс",
  },
  {
    id: "3",
    title: "Дегустация мёда",
    date: "15 января 2026",
    time: "12:00 - 16:00",
    location: "Пасека Иванова",
    type: "Дегустация",
  },
];

const Events = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Календарь событий</h1>
          <p className="text-muted-foreground mt-1">
            Ярмарки, мастер-классы и встречи производителей
          </p>
        </div>

        <div className="space-y-4">
          {mockEvents.map((event) => (
            <article key={event.id} className="content-card hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex gap-4">
                <div className="w-16 text-center shrink-0">
                  <div className="w-14 h-14 mx-auto rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    {event.type}
                  </span>
                  <h3 className="font-medium text-foreground mt-1">{event.title}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Events;
