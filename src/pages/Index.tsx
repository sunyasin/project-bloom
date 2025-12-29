import { MainLayout } from "@/components/layout/MainLayout";
import { Tag, Calendar, Newspaper, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data
const mockStats = [
  { label: "Производителей", value: "156", icon: Building2, href: "/businesses" },
  { label: "Активных акций", value: "42", icon: Tag, href: "/promotions" },
  { label: "Событий", value: "12", icon: Calendar, href: "/events" },
  { label: "Новостей", value: "89", icon: Newspaper, href: "/news" },
];

const mockFeaturedBusinesses = [
  { id: "1", name: "Пасека Иванова", category: "Мёд и продукты пчеловодства", image: null },
  { id: "2", name: "Ферма Петровых", category: "Молочные продукты", image: null },
  { id: "3", name: "Эко-овощи", category: "Овощи и зелень", image: null },
  { id: "4", name: "Хлебный дом", category: "Хлебобулочные изделия", image: null },
];

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Добро пожаловать в Долину Производителей
          </h1>
          <p className="text-muted-foreground mt-1">
            Открывайте местных производителей, следите за акциями и событиями
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                to={stat.href}
                className="content-card hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Featured Businesses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Популярные производители</h2>
            <Link to="/businesses" className="text-sm text-primary hover:underline">
              Все →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockFeaturedBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/business/${business.id}`}
                className="content-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {business.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {business.category}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest News Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Последние новости</h2>
            <Link to="/news" className="text-sm text-primary hover:underline">
              Все →
            </Link>
          </div>
          
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              Здесь будут отображаться последние новости долины
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Index;
