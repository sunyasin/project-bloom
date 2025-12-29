import { MainLayout } from "@/components/layout/MainLayout";
import { Newspaper } from "lucide-react";

// Mock news data
const mockNews = [
  {
    id: "1",
    title: "Открытие нового фермерского рынка",
    excerpt: "В субботу состоится открытие нового фермерского рынка в центре города...",
    date: "28 декабря 2025",
    category: "Анонс",
  },
  {
    id: "2",
    title: "Ярмарка мёда прошла успешно",
    excerpt: "Традиционная ярмарка мёда собрала более 50 производителей...",
    date: "25 декабря 2025",
    category: "Событие",
  },
  {
    id: "3",
    title: "Новые стандарты качества",
    excerpt: "Долина производителей вводит новые стандарты качества для участников...",
    date: "20 декабря 2025",
    category: "Новость",
  },
];

const News = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Новости долины</h1>
          <p className="text-muted-foreground mt-1">
            Актуальные новости и события сообщества
          </p>
        </div>

        <div className="space-y-4">
          {mockNews.map((news) => (
            <article key={news.id} className="content-card hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Newspaper className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                      {news.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{news.date}</span>
                  </div>
                  <h3 className="font-medium text-foreground">{news.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {news.excerpt}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default News;
