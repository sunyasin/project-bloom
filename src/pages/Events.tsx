import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar as CalendarIcon, Loader2, User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, endOfMonth, addMonths, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { NewsItem } from "@/hooks/use-news";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface EventWithAuthor extends NewsItem {
  author?: Profile;
}

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithAuthor[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<EventWithAuthor | null>(null);

  useEffect(() => {
    const fetchEventsAndProfiles = async () => {
      try {
        // Получаем все события
        const { data: eventsData, error: eventsError } = await supabase
          .from("news")
          .select("*")
          .eq("is_published", true)
          .eq("is_event", true)
          .order("event_date", { ascending: true });

        if (eventsError) throw eventsError;

        // Получаем уникальные owner_id
        const ownerIds = [...new Set(eventsData?.map((e) => e.owner_id) || [])];

        // Получаем профили авторов
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name")
          .in("user_id", ownerIds);

        // Создаём словарь профилей
        const profilesMap: Record<string, Profile> = {};
        profilesData?.forEach((p) => {
          profilesMap[p.user_id] = p as Profile;
        });
        setProfiles(profilesMap);

        // Привязываем профили к событиям
        const eventsWithAuthors = (eventsData || []).map((e) => ({
          ...e,
          author: profilesMap[e.owner_id],
        })) as EventWithAuthor[];

        setEvents(eventsWithAuthors);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventsAndProfiles();
  }, []);

  // Подсчёт событий по датам
  const eventsCountByDate = useMemo(() => {
    const count: Record<string, number> = {};
    events.forEach((event) => {
      if (event.event_date) {
        const dateKey = format(new Date(event.event_date), "yyyy-MM-dd");
        count[dateKey] = (count[dateKey] || 0) + 1;
      }
    });
    return count;
  }, [events]);

  // Определение отображаемых событий
  const displayedEvents = useMemo(() => {
    const now = new Date();
    const endOfNextMonth = addMonths(endOfMonth(now), 1);

    if (selectedDate) {
      return events.filter((event) => {
        if (!event.event_date) return false;
        const eventDate = new Date(event.event_date);
        return isSameDay(eventDate, selectedDate);
      });
    }

    // Показать все будущие события текущего и следующего месяца
    return events.filter((event) => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return isWithinInterval(eventDate, { start: now, end: endOfNextMonth });
    });
  }, [events, selectedDate]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Дата не указана";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return { day: "—", month: "" };
    const date = new Date(dateString);
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("ru-RU", { month: "short" }),
    };
  };

  const formatAuthorName = (event: EventWithAuthor) => {
    if (event.author?.first_name || event.author?.last_name) {
      return `${event.author.first_name || ""} ${event.author.last_name || ""}`.trim();
    }
    return "Неизвестный автор";
  };

  const handleAuthorClick = (event: EventWithAuthor) => {
    if (event.author?.id) {
      navigate(`/profile?id=${event.author.id}`);
    }
  };

  // Кастомный компонент для отображения дня с количеством событий
  const DayContent = ({ date }: { date: Date }) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const count = eventsCountByDate[dateKey];

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{format(date, "d")}</span>
        {count !== undefined && count > 0 && (
          <span className="absolute bottom-0 right-0 text-[10px] font-bold text-primary">
            {count}
          </span>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Календарь событий</h1>
          <p className="text-muted-foreground mt-1">
            Ярмарки, мастер-классы и встречи производителей
          </p>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          numberOfMonths={2}
          locale={ru}
          className="p-4 border rounded-lg"
          components={{
            DayContent,
          }}
        />

        {selectedDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(undefined)}
          >
            Показать все события
          </Button>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="content-card text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedDate
                ? `Событий на ${formatDate(events[0]?.event_date || "")} нет`
                : "Предстоящих событий нет"}
            </p>
            {selectedDate && (
              <Button variant="link" onClick={() => setSelectedDate(undefined)} className="mt-2">
                Показать все события
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {selectedDate
                ? `События на ${formatDate(selectedDate.toISOString())}`
                : `События (${displayedEvents.length})`}
            </h2>
            {displayedEvents.map((event) => {
              const shortDate = formatShortDate(event.event_date);
              return (
                <article
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="content-card hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="w-16 text-center shrink-0">
                      {event.image_url ? (
                        <div className="w-14 h-14 mx-auto rounded-lg overflow-hidden">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 mx-auto rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold text-primary">{shortDate.day}</span>
                          <span className="text-xs text-primary">{shortDate.month}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                        Событие
                      </span>
                      <h3 className="font-medium text-foreground mt-1">{event.title}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {formatDate(event.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Инициатор: </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAuthorClick(event);
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          {formatAuthorName(event)}
                        </button>
                      </div>
                      {event.content && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {event.content.replace(/<[^>]*>/g, "").slice(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.image_url && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(selectedEvent.event_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Инициатор: </span>
                {selectedEvent.author ? (
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      if (selectedEvent.author?.id) {
                        navigate(`/profile?id=${selectedEvent.author.id}`);
                      }
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    {formatAuthorName(selectedEvent)}
                  </button>
                ) : (
                  <span className="text-muted-foreground">Неизвестный автор</span>
                )}
              </div>
              {selectedEvent.content && (
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: selectedEvent.content }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Events;
