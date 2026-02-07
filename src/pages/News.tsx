import { MainLayout } from "@/components/layout/MainLayout";
import { Newspaper, Loader2, ArrowLeft, ChevronLeft } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { NewsItem } from "@/hooks/use-news";

const ITEMS_PER_PAGE = 7; // Сколько вмещается на экран

interface NewsByDate {
  date: string;
  displayDate: string;
  items: NewsItem[];
}

const News = () => {
  const { id } = useParams<{ id: string }>();
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [singleNews, setSingleNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Форматирование даты
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  // Группировка новостей по дате
  const newsByDate = useMemo(() => {
    const groups: Record<string, NewsItem[]> = {};
    
    allNews.forEach((item) => {
      const dateKey = new Date(item.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date: date,
      displayDate: formatDate(date),
      items,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allNews, formatDate]);

  // Загрузка новостей
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const from = page * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("is_published", true)
          .eq("is_event", false)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const newNews = (data as NewsItem[]) || [];
        
        if (page === 0) {
          setAllNews(newNews);
        } else {
          setAllNews((prev) => [...prev, ...newNews]);
        }

        // Проверяем общее количество
        const { count } = await supabase
          .from("news")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .eq("is_event", false);
        
        setTotalCount(count || 0);
        setHasMore(from + newNews.length < (count || 0));
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [page]);

  // Загрузка одной новости
  useEffect(() => {
    if (!id) return;
    
    const fetchSingleNews = async () => {
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("id", id)
          .eq("is_published", true)
          .single();

        if (error) throw error;
        setSingleNews(data as NewsItem);
      } catch (error) {
        console.error("Error fetching single news:", error);
      }
    };

    fetchSingleNews();
  }, [id]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Показ одной новости
  if (id && singleNews) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Link to="/news" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            К новостям
          </Link>
          
          <article className="content-card">
            {singleNews.image_url && (
              <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden mb-4">
                <img
                  src={singleNews.image_url}
                  alt={singleNews.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                Новость
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(singleNews.created_at)}
              </span>
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-4">{singleNews.title}</h1>
            
            <div 
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: singleNews.content || "" }}
            />
          </article>
        </div>
      </MainLayout>
    );
  }

  // Список новостей
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Новости долины</h1>
          <p className="text-muted-foreground mt-1">
            Актуальные новости и события сообщества
          </p>
        </div>

        {loading && allNews.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allNews.length === 0 ? (
          <div className="content-card text-center py-12">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Новостей пока нет</p>
          </div>
        ) : (
          <div className="space-y-6">
            {newsByDate.map((group) => (
              <div key={group.date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 border-b pb-2">
                  {group.displayDate}
                </h2>
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/news/${item.id}`}
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {item.content && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item.content.replace(/<[^>]*>/g, "").slice(0, 150)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Кнопка "Предыдущие новости" */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Предыдущие новости
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default News;
