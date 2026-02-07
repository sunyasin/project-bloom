import { MainLayout } from "@/components/layout/MainLayout";
import { Newspaper, Loader2, Calendar, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { NewsItem } from "@/hooks/use-news";

const News = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [singleNews, setSingleNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        if (id) {
          // Fetch single news item
          const { data, error } = await supabase
            .from("news")
            .select("*")
            .eq("id", id)
            .eq("is_published", true)
            .single();

          if (error) throw error;
          setSingleNews(data as NewsItem);
        } else {
          // Fetch all news
          const { data, error } = await supabase
            .from("news")
            .select("*")
            .eq("is_published", true)
            .eq("is_event", false)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setNews((data as NewsItem[]) || []);
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Show single news item
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
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
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

  // Show news list
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Новости долины</h1>
          <p className="text-muted-foreground mt-1">
            Актуальные новости и события сообщества
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : news.length === 0 ? (
          <div className="content-card text-center py-12">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Новостей пока нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="block content-card hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex gap-4">
                  {item.image_url ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Newspaper className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                        Новость
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    {item.content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default News;
