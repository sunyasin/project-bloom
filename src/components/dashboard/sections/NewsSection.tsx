import { useState } from "react";
import { Newspaper, Plus, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsItem {
  id: string;
  title: string;
  created_at: string;
  is_event: boolean;
  event_date: string | null;
}

interface NewsSectionProps {
  news: NewsItem[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NewsSection({
  news,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: NewsSectionProps) {
  const [showAllNews, setShowAllNews] = useState(news.length <= 5);

  if (loading) {
    return (
      <div>
        <h2 className="section-title flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Новости
        </h2>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const displayedNews = news.slice(0, 5);
  const visibleNews = showAllNews ? news : displayedNews;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2 mb-0">
          <Newspaper className="h-5 w-5" />
          Новости
        </h2>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      <div className="content-card">
        {visibleNews.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет новостей</p>
        ) : (
          <div className="space-y-2">
            {visibleNews.map((newsItem) => (
              <div
                key={newsItem.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                {newsItem.is_event && <Calendar className="h-4 w-4 text-primary flex-shrink-0" />}
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {new Date(newsItem.created_at).toLocaleDateString("ru-RU")}
                </span>
                <span className="text-sm font-medium text-foreground flex-1 truncate">{newsItem.title}</span>
                {newsItem.is_event && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex-shrink-0">
                    Событие
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(newsItem.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(newsItem.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAllNews && news.length > 5 && (
          <button onClick={() => setShowAllNews(true)} className="mt-3 text-sm text-primary hover:underline">
            Все →
          </button>
        )}
        {showAllNews && news.length > 5 && (
          <button onClick={() => setShowAllNews(false)} className="mt-3 text-sm text-primary hover:underline">
            Свернуть
          </button>
        )}
      </div>
    </div>
  );
}
