import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar, MapPin, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NewsItem } from "@/hooks/use-news";

const Events = () => {
  const [events, setEvents] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<NewsItem | null>(null);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Календарь событий</h1>
          <p className="text-muted-foreground mt-1">
            Ярмарки, мастер-классы и встречи производителей
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="content-card text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Предстоящих событий нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
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
                          <Calendar className="h-4 w-4" />
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
                <Calendar className="h-4 w-4" />
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
