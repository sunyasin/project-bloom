import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar, Newspaper, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Mock promotions data
const mockPromotions = [
  {
    id: "1",
    title: "Скидка 20% на мёд",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
    description: "Только до конца месяца! Скидка 20% на весь ассортимент мёда от Пасеки Иванова. Натуральный мёд прямо с пасеки.",
    business: "Пасека Иванова",
    validUntil: "31.01.2025",
  },
  {
    id: "2",
    title: "2+1 на молочные продукты",
    image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop",
    description: "Акция 2+1 на все молочные продукты! Купите 2 товара и получите третий в подарок. Свежее молоко, творог, сметана.",
    business: "Ферма Петровых",
    validUntil: "15.02.2025",
  },
  {
    id: "3",
    title: "Свежие овощи со скидкой",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
    description: "Свежие сезонные овощи со скидкой до 30%. Только экологически чистая продукция без химикатов.",
    business: "Эко-овощи",
    validUntil: "28.02.2025",
  },
  {
    id: "4",
    title: "Хлеб по старинным рецептам",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    description: "Попробуйте наш новый хлеб по старинным рецептам! Скидка 15% на первую покупку.",
    business: "Хлебный дом",
    validUntil: "10.02.2025",
  },
  {
    id: "5",
    title: "Домашние яйца",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop",
    description: "Домашние яйца от кур свободного выгула. Скидка 10% при покупке от 30 штук.",
    business: "Птицеферма Солнечная",
    validUntil: "20.02.2025",
  },
  {
    id: "6",
    title: "Сыры ручной работы",
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
    description: "Авторские сыры ручной работы со скидкой 25%. Попробуйте уникальные вкусы от местных сыроваров.",
    business: "Сырная лавка",
    validUntil: "05.03.2025",
  },
];

// Mock data
const mockStats = [
  { label: "Производителей", value: "156", icon: Building2, href: "/businesses" },
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
  const [selectedPromotion, setSelectedPromotion] = useState<typeof mockPromotions[0] | null>(null);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Promotions Carousel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Актуальные акции</h2>
            <Link to="/promotions" className="text-sm text-primary hover:underline">
              Все акции →
            </Link>
          </div>
          
          <div className="relative">
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3">
                {mockPromotions.map((promo) => (
                  <CarouselItem
                    key={promo.id}
                    className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4"
                  >
                    <button
                      onClick={() => setSelectedPromotion(promo)}
                      className="w-full text-left content-card p-0 overflow-hidden hover:border-primary/30 transition-all hover:shadow-md group"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={promo.image}
                          alt={promo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-foreground text-sm truncate">
                          {promo.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {promo.business}
                        </p>
                      </div>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 -translate-x-1/2" />
              <CarouselNext className="right-0 translate-x-1/2" />
            </Carousel>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
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

      {/* Promotion Details Dialog */}
      <Dialog open={!!selectedPromotion} onOpenChange={() => setSelectedPromotion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPromotion?.title}</DialogTitle>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={selectedPromotion.image}
                  alt={selectedPromotion.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="text-foreground">{selectedPromotion.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedPromotion.business}</span>
                  <span>До {selectedPromotion.validUntil}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;
