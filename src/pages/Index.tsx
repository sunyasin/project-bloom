import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion, Category } from "@/types/db";
import type { NewsItem } from "@/hooks/use-news";
import type { User } from "@supabase/supabase-js";

// Category image mapping
const categoryImages: Record<string, string> = {
  "Выпечка": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop",
  "Колбасы": "https://images.unsplash.com/photo-1558030006-450675393462?w=200&h=200&fit=crop",
  "Консервы": "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=200&h=200&fit=crop",
  "Крупы": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop",
  "Молочные продукты": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop",
  "Мёд": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop",
  "Мясо": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop",
  "Овощи": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop",
  "Птица": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&h=200&fit=crop",
  "Рыба": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=200&h=200&fit=crop",
  "Сыры": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop",
  "Фрукты": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop",
  "Яйца": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop",
};

const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop";


const DEFAULT_PROMO_IMAGE = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop";

// Default event image
const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=50&h=50&fit=crop";


const Index = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [events, setEvents] = useState<NewsItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user?.email) {
        setSubscribeEmail(session.user.email);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user?.email) {
        setSubscribeEmail(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load promotions from database
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data, error } = await supabase
          .from("promotions")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setPromotions((data as Promotion[]) || []);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      } finally {
        setPromotionsLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  // Load events (news with is_event = true)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("is_published", true)
          .eq("is_event", true)
          .order("event_date", { ascending: true })
          .limit(10);

        if (error) throw error;
        setEvents((data as NewsItem[]) || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Load news (non-event news)
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .eq("is_published", true)
          .eq("is_event", false)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setNews((data as NewsItem[]) || []);
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Load categories that have products or businesses
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Get all visible categories
        const { data: allCategories, error: catError } = await supabase
          .from("categories")
          .select("*")
          .eq("is_hidden", false)
          .order("name");

        if (catError) throw catError;

        // Get category IDs that have products
        const { data: productCategories, error: prodError } = await supabase
          .from("products")
          .select("category_id")
          .eq("is_available", true)
          .not("category_id", "is", null);

        if (prodError) throw prodError;

        // Get category IDs that have published businesses
        const { data: businessCategories, error: bizError } = await supabase
          .from("businesses")
          .select("category_id")
          .eq("status", "published")
          .not("category_id", "is", null);

        if (bizError) throw bizError;

        // Combine unique category IDs
        const categoryIdsWithContent = new Set([
          ...(productCategories || []).map(p => p.category_id),
          ...(businessCategories || []).map(b => b.category_id),
        ]);

        // Filter categories that have content
        const categoriesWithContent = (allCategories || [])
          .filter(cat => categoryIdsWithContent.has(cat.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        setCategories(categoriesWithContent as Category[]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
          
          {promotionsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : promotions.length === 0 ? (
            <p className="text-muted-foreground">Нет активных акций</p>
          ) : (
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-3">
                  {promotions.map((promo) => (
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
                            src={promo.image_url || DEFAULT_PROMO_IMAGE}
                            alt={promo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-foreground text-sm truncate">
                            {promo.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {promo.discount}
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
          )}
        </section>

        {/* Events of the Week */}
        <section id="events">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">События недели</h2>
            <Link to="/events" className="text-sm text-primary hover:underline whitespace-nowrap">
              Все →
            </Link>
          </div>
          
          {eventsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">Нет предстоящих событий</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/news/${event.id}`}
                  className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <img
                    src={event.image_url || DEFAULT_EVENT_IMAGE}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {event.event_date 
                        ? new Date(event.event_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
                        : new Date(event.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
                      }
                    </p>
                    <p className="text-sm text-foreground leading-tight line-clamp-2">
                      {event.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Категории</h2>
            <Link to="/categories" className="text-sm text-primary hover:underline">
              Все →
            </Link>
          </div>
          
          {categoriesLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground">Нет категорий с товарами</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))" }}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="flex flex-col items-center p-2 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group"
                >
                  <div className="w-full aspect-square rounded-md overflow-hidden mb-2">
                    <img
                      src={categoryImages[category.name] || DEFAULT_CATEGORY_IMAGE}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs text-foreground text-center truncate w-full">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* News Section */}
        <section id="news">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Новости</h2>
            <Link to="/news" className="text-sm text-primary hover:underline">
              Все →
            </Link>
          </div>
          
          {newsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : news.length === 0 ? (
            <p className="text-muted-foreground">Нет новостей</p>
          ) : (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {news.slice(0, 10).map((newsItem) => (
                <Link
                  key={newsItem.id}
                  to={`/news/${newsItem.id}`}
                  className="block px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm text-foreground leading-snug line-clamp-2">
                    {newsItem.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Subscribe Button */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setIsSubscribeDialogOpen(true)}
            className="gap-2"
            disabled={!currentUser}
            title={!currentUser ? "Войдите, чтобы подписаться" : undefined}
          >
            <Mail className="h-4 w-4" />
            Подписка на новости
          </Button>
        </div>
      </div>

      {/* Promotion Details Dialog */}
      <Dialog open={!!selectedPromotion} onOpenChange={() => setSelectedPromotion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPromotion?.title}</DialogTitle>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              {selectedPromotion.image_url && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={selectedPromotion.image_url}
                    alt={selectedPromotion.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-3">
                {selectedPromotion.description && (
                  <p className="text-foreground">{selectedPromotion.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                    {selectedPromotion.discount}
                  </span>
                  {selectedPromotion.valid_until && (
                    <span className="text-muted-foreground">
                      Действует до {new Date(selectedPromotion.valid_until).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
                {selectedPromotion.donation > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Донат: {selectedPromotion.donation} ₽
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button asChild className="w-full sm:w-auto">
                  <Link to={`/business/${selectedPromotion.business_id}`}>
                    Перейти к визитке
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Newsletter Subscribe Dialog */}
      <Dialog open={isSubscribeDialogOpen} onOpenChange={setIsSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подписка на новости</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Подпишитесь на рассылку и получайте новости долины и производителей на вашу почту.
            </p>
            <div className="space-y-2">
              <Label htmlFor="subscribe-email">Email</Label>
              <Input
                id="subscribe-email"
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={async () => {
                setIsSubscribing(true);
                try {
                  // Upsert subscription with send_common = true
                  const { error } = await supabase
                    .from("newsletter_subscriptions")
                    .upsert(
                      { email: subscribeEmail, send_common: true, enabled: true },
                      { onConflict: "email" }
                    );

                  if (error) throw error;

                  toast({
                    title: "Успешно!",
                    description: "Вы подписаны на новости",
                  });
                  setIsSubscribeDialogOpen(false);
                } catch (error) {
                  console.error("Error subscribing:", error);
                  toast({
                    title: "Ошибка",
                    description: "Не удалось оформить подписку",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubscribing(false);
                }
              }}
              disabled={isSubscribing || !subscribeEmail}
            >
              {isSubscribing ? "Подписка..." : "Подписаться"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;
