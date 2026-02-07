import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mail, Send } from "lucide-react";
import { TELEGRAM_BOT_USERNAME } from "@/config/telegram";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion, Category } from "@/types/db";
import type { NewsItem } from "@/hooks/use-news";
import type { User } from "@supabase/supabase-js";

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
  const [pendingToken, setPendingToken] = useState<string | null>(null);
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

  // Poll for subscription result when pending token exists
  useEffect(() => {
    if (!pendingToken) return;

    const checkSubscription = async () => {
      const { data: tokenData } = await supabase
        .from("telegram_subscription_tokens")
        .select("id")
        .eq("token", pendingToken)
        .single();

      if (!tokenData) {
        // Token was used - subscription completed
        toast({
          title: "Успешно!",
          description: "Вы подписались на новости и события портала",
        });
        setPendingToken(null);
      }
    };

    // Check immediately, then every 2 seconds
    checkSubscription();
    const interval = setInterval(checkSubscription, 2000);

    // Stop polling after 60 seconds
    const timeout = setTimeout(() => {
      setPendingToken(null);
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pendingToken]);

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
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="flex flex-col items-center p-2 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="w-full aspect-square rounded-md overflow-hidden mb-2">
                    <img
                      src={category.image_url || DEFAULT_CATEGORY_IMAGE}
                      alt={category.name}
                      className="w-full h-full object-cover"
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
              Подпишитесь на новости и события долины и получайте уведомления в Telegram.
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Подписка через Telegram:</p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  const email = currentUser?.email || subscribeEmail;
                  if (!email) {
                    toast({
                      title: "Ошибка",
                      description: "Введите email для подписки",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    // Generate unique token
                    const token = crypto.randomUUID();
                    
                    // Save token to database
                    const { error: tokenError } = await supabase
                      .from("telegram_subscription_tokens")
                      .insert({
                        email,
                        token,
                        type: "common",
                      });

                    if (tokenError) throw tokenError;

                    // Store token for polling
                    setPendingToken(token);

                    // Open Telegram bot
                    window.open(
                      `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`,
                      "_blank"
                    );

                    toast({
                      title: "Перейдите в Telegram",
                      description: "Нажмите /start в боте для подтверждения подписки",
                    });
                    setIsSubscribeDialogOpen(false);
                  } catch (error) {
                    console.error("Error creating Telegram subscription:", error);
                    toast({
                      title: "Ошибка",
                      description: "Не удалось создать ссылку для подписки",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Send className="h-4 w-4" />
                Подписаться через Telegram
              </Button>
              <p className="text-xs text-muted-foreground">
                Вы получите уведомления о новостях и событиях в Telegram
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;

