import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Phone, Mail, Globe, Tag, Package, ShoppingCart, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Product, Promotion } from "@/types/db";

interface BusinessCard {
  id: string;
  name: string;
  image: string;
  description?: string;
  isMain?: boolean;
}

interface Profile {
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

// Mock order API (оставляем по просьбе пользователя)
const mockAPISendOrder = async (order: { products: any[]; phone: string; businessId: string }) => {
  console.log("Sending order:", order);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true, orderId: `ORD-${Date.now()}` };
};

// Mock subscribe API (оставляем по просьбе пользователя)
const mockAPISubscribeProducer = async (producerId: string, email: string) => {
  console.log(`[mockAPI] POST /api/producers/${producerId}/subscribe`, { email });
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, message: "Подписка на новости производителя оформлена" };
};

const BusinessPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Состояния для данных из БД
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderPhone, setOrderPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Subscribe to producer news state
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);

  // Загрузка данных из Supabase
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Загрузить визитку по ID (только published)
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (businessError || !businessData) {
        console.error("Business fetch error:", businessError);
        setLoading(false);
        return;
      }

      setBusiness(businessData as Business);

      const ownerId = businessData.owner_id;

      // Параллельно загружаем все остальные данные
      const [cardsResult, productsResult, profileResult, promotionsResult] = await Promise.all([
        // 2. Все визитки этого владельца
        supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("status", "published"),
        
        // 3. Товары этого владельца
        supabase
          .from("products")
          .select("*")
          .eq("producer_id", ownerId)
          .eq("is_available", true),
        
        // 4. Профиль владельца для контактов
        supabase
          .from("profiles")
          .select("phone, email, logo_url")
          .eq("user_id", ownerId)
          .maybeSingle(),
        
        // 5. Акции владельца
        supabase
          .from("promotions")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("is_active", true),
      ]);

      // Преобразуем визитки в формат BusinessCard
      const cards: BusinessCard[] = (cardsResult.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        image: b.content_json?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
        description: b.content_json?.description || "",
        isMain: b.id === id, // Текущая визитка - главная
      }));

      setBusinessCards(cards);
      setProducts((productsResult.data || []) as Product[]);
      setOwnerProfile(profileResult.data as Profile | null);
      setPromotions((promotionsResult.data || []) as Promotion[]);

      // Установить выбранную карточку
      const mainCard = cards.find(c => c.isMain) || cards[0];
      setSelectedCard(mainCard || null);

      // Установить контактные данные пользователя для заказа/подписки
      if (profileResult.data) {
        setOrderPhone(profileResult.data.phone || "");
        setSubscribeEmail(profileResult.data.email || "");
      }

      setLoading(false);
    };

    fetchBusinessData();
  }, [id]);

  const handleProductSelect = (product: SelectedProduct, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, product]);
    } else {
      setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
    }
  };

  const isSelected = (productId: string) => selectedProducts.some(p => p.id === productId);

  const handleOrderSubmit = async () => {
    if (selectedProducts.length === 0) return;

    setIsSubmitting(true);
    try {
      await mockAPISendOrder({ products: selectedProducts, phone: orderPhone, businessId: id || "" });
      toast({
        title: "Заказ отправлен",
        description: `Заказ на ${selectedProducts.length} товар(ов) успешно отправлен производителю`,
      });
      setSelectedProducts([]);
      setOrderDialogOpen(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заказ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      await mockAPISubscribeProducer(id || "", subscribeEmail);
      toast({
        title: "Успешно!",
        description: `Вы подписаны на новости ${business?.name}`,
      });
      setIsSubscribeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось оформить подписку",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!business) {
    return (
      <MainLayout>
        <div className="content-card text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Производитель не найден</p>
        </div>
      </MainLayout>
    );
  }

  // Извлекаем данные из content_json
  const contentJson = business.content_json as Record<string, any> || {};
  const description = contentJson.description || "";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="content-card">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {ownerProfile?.logo_url ? (
                <img src={ownerProfile.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
              <p className="text-primary mt-1">{business.category}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {business.location}, {business.city}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => setIsSubscribeDialogOpen(true)}>
                <Bell className="h-4 w-4 mr-1" />
                Подписка
              </Button>
              <Button>Связаться</Button>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="content-card">
            <h2 className="section-title">О производителе</h2>
            <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
          </div>
        )}

        {/* Business Cards (Визитки) */}
        {businessCards.length > 0 && (
          <div>
            <h2 className="section-title">Визитки</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {businessCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`content-card hover:border-primary/30 transition-all hover:shadow-md group p-3 text-left ${
                    selectedCard?.id === card.id ? "ring-2 ring-primary border-primary" : ""
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground text-center truncate">
                    {card.name}
                  </p>
                </button>
              ))}
            </div>

            {/* Selected card preview */}
            {selectedCard && (
              <div className="content-card mt-4">
                <div className="flex gap-4">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img
                      src={selectedCard.image}
                      alt={selectedCard.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{selectedCard.name}</h3>
                    {selectedCard.description && (
                      <div className="text-sm text-muted-foreground mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedCard.description }} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products (Товары) with ordering */}
        {products.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2 mb-0">
                <Package className="h-5 w-5" />
                Товары
              </h2>
              <Button
                disabled={selectedProducts.length === 0}
                onClick={() => setOrderDialogOpen(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Заказать
                {selectedProducts.length > 0 && (
                  <span className="ml-1 bg-primary-foreground/20 px-1.5 rounded-full text-xs">
                    {selectedProducts.length}
                  </span>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => {
                const selected = isSelected(product.id);
                return (
                  <div
                    key={product.id}
                    className={`content-card hover:border-primary/30 transition-all hover:shadow-md p-3 ${
                      selected ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => handleProductSelect({
                          id: product.id,
                          name: product.name,
                          price: product.price || 0,
                          image: product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop"
                        }, checked as boolean)}
                      />
                      <span className="text-xs text-muted-foreground">Выбрать</span>
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                      <img
                        src={product.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-primary font-semibold">{product.price || 0} ₽/{product.unit || "шт"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contacts */}
        <div className="content-card">
          <h2 className="section-title">Контакты</h2>
          <div className="space-y-3">
            {ownerProfile?.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{ownerProfile.phone}</span>
              </div>
            )}
            {ownerProfile?.email && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{ownerProfile.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Promotions */}
        {promotions.length > 0 && (
          <div className="content-card">
            <h2 className="section-title">Активные акции</h2>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="promo-card">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{promo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Скидка: {promo.discount}
                        {promo.valid_until && ` • до ${new Date(promo.valid_until).toLocaleDateString("ru-RU")}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Выбранные товары:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-primary">{product.price} ₽</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-right">
                Итого: {selectedProducts.reduce((sum, p) => sum + p.price, 0)} ₽
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Ваш телефон</Label>
              <Input
                id="phone"
                value={orderPhone}
                onChange={(e) => setOrderPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleOrderSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Отправить заказ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog */}
      <Dialog open={isSubscribeDialogOpen} onOpenChange={setIsSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подписка на новости</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Подпишитесь на новости производителя "{business.name}" и получайте уведомления о новых товарах и акциях.
            </p>
            <div className="space-y-2">
              <Label htmlFor="subscribe-email">Ваш email</Label>
              <Input
                id="subscribe-email"
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="example@mail.ru"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubscribe} disabled={isSubscribing || !subscribeEmail}>
              {isSubscribing ? "Подписка..." : "Подписаться"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessPage;
