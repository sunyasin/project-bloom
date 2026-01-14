import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar as CalendarIcon, Loader2, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NewsItem } from "@/hooks/use-news";
import type { DateRange } from "react-day-picker";

const Events = () => {
  const [events, setEvents] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<NewsItem | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("is_published", true)
          .eq("is_event", true)
          .order("event_date", { ascending: true });

        if (error) throw error;
        setEvents((data as NewsItem[]) || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    if (!dateRange?.from) return events;

    return events.filter((event) => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      const from = dateRange.from!;
      const to = dateRange.to || dateRange.from!;

      // Reset hours for comparison
      eventDate.setHours(0, 0, 0, 0);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      return eventDate >= from && eventDate <= to;
    });
  }, [events, dateRange]);

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

  const clearFilter = () => {
    setDateRange(undefined);
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

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "d MMM", { locale: ru })} —{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: ru })}
                    </>
                  ) : (
                    format(dateRange.from, "d MMMM yyyy", { locale: ru })
                  )
                ) : (
                  <span>Выберите даты</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ru}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {dateRange?.from && (
            <Button variant="ghost" size="sm" onClick={clearFilter}>
              <X className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            Найдено: {filteredEvents.length} из {events.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="content-card text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {dateRange?.from ? "Событий в выбранном диапазоне нет" : "Предстоящих событий нет"}
            </p>
            {dateRange?.from && (
              <Button variant="link" onClick={clearFilter} className="mt-2">
                Сбросить фильтр
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
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
