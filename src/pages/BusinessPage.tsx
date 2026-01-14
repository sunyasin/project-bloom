import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Phone, Mail, Globe, Tag, Package, ShoppingCart, Bell, Loader2, MessageCircle, Send, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Product, Promotion } from "@/types/db";
import type { User } from "@supabase/supabase-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductSaleType = 'sell_only' | 'barter_goods' | 'barter_coin' | 'all';

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
  const [orderAddress, setOrderAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to producer news state
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);

  // Digital exchange states
  const [digitalExchangeDialogOpen, setDigitalExchangeDialogOpen] = useState(false);
  const [exchangeMessageSent, setExchangeMessageSent] = useState(false);
  const [exchangeMessage, setExchangeMessage] = useState("");
  const [currentUserName, setCurrentUserName] = useState<string>("");

  // Goods exchange states
  const [goodsExchangeDialogOpen, setGoodsExchangeDialogOpen] = useState(false);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [producerProductQuantities, setProducerProductQuantities] = useState<Record<string, number>>({});
  const [userProductQuantities, setUserProductQuantities] = useState<Record<string, number>>({});
  const [exchangeComment, setExchangeComment] = useState("");

  // Contact message states
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);

  // Sale type filter
  const [saleTypeFilter, setSaleTypeFilter] = useState<ProductSaleType>("all");

  // Product detail dialog
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Current user for auth check
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);
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
        supabase.from("businesses").select("*").eq("owner_id", ownerId).eq("status", "published"),

        // 3. Товары этого владельца
        supabase.from("products").select("*").eq("producer_id", ownerId).eq("is_available", true),

        // 4. Профиль владельца для контактов
        supabase.from("profiles").select("phone, email, logo_url").eq("user_id", ownerId).maybeSingle(),

        // 5. Акции владельца
        supabase.from("promotions").select("*").eq("owner_id", ownerId).eq("is_active", true),
      ]);

      // Преобразуем визитки в формат BusinessCard
      const cards: BusinessCard[] = (cardsResult.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        image: b.content_json?.image || "",
        description: b.content_json?.description || "",
        isMain: b.id === id, // Текущая визитка - главная
      }));
      //no image -> https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop

      setBusinessCards(cards);
      setProducts((productsResult.data || []) as Product[]);
      setOwnerProfile(profileResult.data as Profile | null);
      setPromotions((promotionsResult.data || []) as Promotion[]);

      // Установить выбранную карточку
      const mainCard = cards.find((c) => c.isMain) || cards[0];
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

  // Fetch current user name and products for exchange
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [profileResult, productsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("products")
            .select("*")
            .eq("producer_id", user.id)
            .eq("is_available", true)
        ]);
        
        if (profileResult.data) {
          const name = [profileResult.data.first_name, profileResult.data.last_name].filter(Boolean).join(" ") || profileResult.data.email || "Аноним";
          setCurrentUserName(name);
        }
        
        if (productsResult.data) {
          setUserProducts(productsResult.data as Product[]);
        }
      }
    };
    fetchCurrentUserData();
  }, []);

  const handleProductSelect = (product: SelectedProduct, selected: boolean) => {
    if (selected) {
      setSelectedProducts((prev) => [...prev, product]);
    } else {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  };

  const isSelected = (productId: string) => selectedProducts.some((p) => p.id === productId);

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
    if (!business?.owner_id) return;
    
    setIsSubscribing(true);
    try {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from("newsletter_subscriptions")
        .select("id, send_profiles")
        .eq("email", subscribeEmail)
        .maybeSingle();

      if (existing) {
        // Update existing subscription - add profile to send_profiles array
        const currentProfiles = (existing.send_profiles as string[]) || [];
        if (!currentProfiles.includes(business.owner_id)) {
          const { error } = await supabase
            .from("newsletter_subscriptions")
            .update({ 
              send_profiles: [...currentProfiles, business.owner_id],
              enabled: true
            })
            .eq("id", existing.id);
          
          if (error) throw error;
        }
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .insert({
            email: subscribeEmail,
            send_profiles: [business.owner_id],
            enabled: true
          });
        
        if (error) throw error;
      }

      toast({
        title: "Успешно!",
        description: `Вы подписаны на новости ${business?.name}`,
      });
      setIsSubscribeDialogOpen(false);
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось оформить подписку",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDigitalExchange = async () => {
    if (selectedProducts.length === 0) return;
    
    const now = new Date();
    const dateStr = now.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const productsList = selectedProducts
      .map((p) => `${p.name} (${p.price} ₽)`)
      .join("\n");
    
    const totalSum = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    
    const message = `Предлагаю обмен.\n${productsList}\nНа сумму ${totalSum} ₽.\n${dateStr}.\nОт кого: ${currentUserName || "Аноним"}.`;
    
    // Save message to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user && business?.owner_id) {
      await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.owner_id,
        message,
        type: "exchange" as const,
      });
    }
    
    setExchangeMessage(message);
    setDigitalExchangeDialogOpen(false);
    setExchangeMessageSent(true);
  };

  const handleOpenGoodsExchange = () => {
    if (selectedProducts.length === 0) return;
    // Initialize producer product quantities for selected products
    const initialQuantities: Record<string, number> = {};
    selectedProducts.forEach(p => {
      initialQuantities[p.id] = 1;
    });
    setProducerProductQuantities(initialQuantities);
    setUserProductQuantities({});
    setExchangeComment("");
    setGoodsExchangeDialogOpen(true);
  };

  const handleGoodsExchange = async () => {
    const producerProductsList = selectedProducts
      .filter(p => producerProductQuantities[p.id] > 0)
      .map(p => `${p.name} (${producerProductQuantities[p.id]} шт)`)
      .join(", ");
    
    const userProductsList = userProducts
      .filter(p => userProductQuantities[p.id] > 0)
      .map(p => `${p.name} (${userProductQuantities[p.id]} шт)`)
      .join(", ");
    
    const message = `Запрос обмена от ${currentUserName || "Аноним"}.
Выбраны ваши товары: ${producerProductsList || "не выбраны"}
Предлагаю обмен на: ${userProductsList || "не выбраны"}
Сообщение: ${exchangeComment || "без сообщения"}`;
    
    // Save message to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user && business?.owner_id) {
      await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.owner_id,
        message,
        type: "exchange" as const,
      });
    }
    
    setExchangeMessage(message);
    setGoodsExchangeDialogOpen(false);
    setExchangeMessageSent(true);
  };

  const handleSendContactMessage = async () => {
    if (!contactMessage.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите сообщение",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы отправить сообщение",
        variant: "destructive",
      });
      return;
    }

    if (!business?.owner_id) return;

    setIsSendingContact(true);

    const { error } = await supabase.from("messages").insert({
      from_id: user.id,
      to_id: business.owner_id,
      message: contactMessage.trim(),
      type: "chat" as const,
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Отправлено",
        description: `Сообщение отправлено ${business.name}`,
      });
      setContactMessage("");
      setContactDialogOpen(false);
    }

    setIsSendingContact(false);
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
  const contentJson = (business.content_json as Record<string, any>) || {};
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
              <Button 
                variant="outline" 
                onClick={() => setIsSubscribeDialogOpen(true)}
                disabled={!currentUser}
                title={!currentUser ? "Войдите, чтобы подписаться" : undefined}
              >
                <Bell className="h-4 w-4 mr-1" />
                Подписка
              </Button>
              <Button 
                onClick={() => setContactDialogOpen(true)}
                disabled={!currentUser}
                title={!currentUser ? "Войдите, чтобы связаться" : undefined}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Связаться
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="content-card">
            <h2 className="section-title">О производителе</h2>
            <div
              className="text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        

        {/* Products (Товары) with ordering */}
        {products.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="section-title flex items-center gap-2 mb-0">
                <Package className="h-5 w-5" />
                Товары
              </h2>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={saleTypeFilter} onValueChange={(v) => setSaleTypeFilter(v as ProductSaleType)}>
                    <SelectTrigger className="w-44 bg-background">
                      <SelectValue placeholder="Тип продажи" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="sell_only">Только продажа</SelectItem>
                      <SelectItem value="barter_goods">Бартер товар-товар</SelectItem>
                      <SelectItem value="barter_coin">Бартер цифровой</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={selectedProducts.length === 0} onClick={() => setOrderDialogOpen(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Заказать
                  {selectedProducts.length > 0 && (
                    <span className="ml-1 bg-primary-foreground/20 px-1.5 rounded-full text-xs">
                      {selectedProducts.length}
                    </span>
                  )}
                </Button>
                <Button variant="outline" disabled={selectedProducts.length === 0} onClick={handleOpenGoodsExchange}>
                  Обмен на товары
                </Button>
                <Button variant="outline" disabled={selectedProducts.length === 0} onClick={() => setDigitalExchangeDialogOpen(true)}>
                  Обмен цифровой
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products
                .filter(p => saleTypeFilter === "all" || (p as any).sale_type === saleTypeFilter)
                .map((product) => {
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
                        disabled={!currentUser}
                        onCheckedChange={(checked) =>
                          handleProductSelect(
                            {
                              id: product.id,
                              name: product.name,
                              price: product.price || 0,
                              image:
                                product.image_url ||
                                "https://images.unsplash.com/photo-472354-b33ff0c44a43?w=200&h=200&fit=crop",
                            },
                            checked as boolean,
                          )
                        }
                      />
                      <span className={`text-xs ${!currentUser ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        {!currentUser ? 'Войдите' : 'Выбрать'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProductDetail(product);
                        setGalleryIndex(0);
                        setProductDetailOpen(true);
                      }}
                      className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted cursor-pointer hover:opacity-90 transition-opacity w-full"
                    >
                      <img src={product.image_url || ""} alt={product.name} className="w-full h-full object-cover" />
                    </button>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-primary font-semibold">
                      {product.price || 0} ₽/{product.unit || "шт"}
                    </p>
                  </div>
                );
              })}
            </div>
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
                  <p className="text-sm font-medium text-foreground text-center truncate">{card.name}</p>
                </button>
              ))}
            </div>

            {/* Selected card preview */}
            {selectedCard && (
              <div className="content-card mt-4">
                <div className="flex gap-4">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={selectedCard.image} alt={selectedCard.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{selectedCard.name}</h3>
                    {selectedCard.description && (
                      <div
                        className="text-sm text-muted-foreground mt-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedCard.description }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop*/}
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
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
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

            <div className="space-y-2">
              <Label htmlFor="address">Адрес доставки</Label>
              <Input
                id="address"
                value={orderAddress}
                onChange={(e) => setOrderAddress(e.target.value)}
                placeholder="Город, улица, дом, квартира"
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

      {/* Digital Exchange Dialog */}
      <Dialog open={digitalExchangeDialogOpen} onOpenChange={setDigitalExchangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Обмен цифровой</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Выбранные товары:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-primary">{product.price} ₽</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-lg font-semibold text-center">
              Я предлагаю: {selectedProducts.reduce((sum, p) => sum + p.price, 0)} долей
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDigitalExchangeDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleDigitalExchange}>
              Отправить продавцу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goods Exchange Dialog */}
      <Dialog open={goodsExchangeDialogOpen} onOpenChange={setGoodsExchangeDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Обмен на товары</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left column - Producer products */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Товары производителя</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-primary">{product.price} ₽</p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={producerProductQuantities[product.id] || 1}
                        onChange={(e) => setProducerProductQuantities(prev => ({
                          ...prev,
                          [product.id]: parseInt(e.target.value) || 1
                        }))}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column - User products */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Ваши товары</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userProducts.length > 0 ? (
                    userProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-primary">{product.price} ₽</p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={userProductQuantities[product.id] || 0}
                          onChange={(e) => setUserProductQuantities(prev => ({
                            ...prev,
                            [product.id]: parseInt(e.target.value) || 0
                          }))}
                          className="w-16 h-8 text-center"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      У вас нет товаров для обмена
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Comment field */}
            <div className="space-y-2">
              <Label htmlFor="exchange-comment">Сообщение</Label>
              <Input
                id="exchange-comment"
                value={exchangeComment}
                onChange={(e) => setExchangeComment(e.target.value)}
                placeholder="Введите сообщение..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoodsExchangeDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleGoodsExchange}>
              Отправить запрос
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exchange Message Sent Dialog */}
      <Dialog open={exchangeMessageSent} onOpenChange={setExchangeMessageSent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сообщение отправлено</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg font-mono">
              {exchangeMessage}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setExchangeMessageSent(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Message Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Написать сообщение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Отправить сообщение производителю <span className="font-medium text-foreground">{business?.name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Сообщение</Label>
              <Textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Введите ваше сообщение..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSendContactMessage} disabled={isSendingContact || !contactMessage.trim()}>
              <Send className="h-4 w-4 mr-1" />
              {isSendingContact ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={productDetailOpen} onOpenChange={setProductDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProductDetail?.name || "Товар"}</DialogTitle>
          </DialogHeader>
          
          {selectedProductDetail && (
            <div className="space-y-4">
              {/* Product Image Gallery */}
              {(() => {
                const allImages = [
                  selectedProductDetail.image_url,
                  ...(selectedProductDetail.gallery_urls || [])
                ].filter(Boolean) as string[];
                
                if (allImages.length === 0) return null;
                
                return (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={allImages[galleryIndex] || allImages[0]} 
                        alt={selectedProductDetail.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                    {/* Navigation arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setGalleryIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setGalleryIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        
                        {/* Dots indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setGalleryIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                idx === galleryIndex ? "bg-primary" : "bg-background/60"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    
                    {/* Thumbnails */}
                    {allImages.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {allImages.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => setGalleryIndex(idx)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                              idx === galleryIndex ? "border-primary" : "border-transparent"
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Price and Unit */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {selectedProductDetail.price || 0} ₽
                </span>
                <span className="text-muted-foreground">
                  / {selectedProductDetail.unit || "шт"}
                </span>
              </div>

              {/* Sale Type Badge */}
              <div>
                {(selectedProductDetail as any).sale_type === "barter_goods" && (
                  <span className="inline-block text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded">
                    Бартер товар-товар
                  </span>
                )}
                {(selectedProductDetail as any).sale_type === "barter_coin" && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                    Бартер цифровой
                  </span>
                )}
                {((selectedProductDetail as any).sale_type === "sell_only" || !(selectedProductDetail as any).sale_type) && (
                  <span className="inline-block text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                    Только продажа
                  </span>
                )}
              </div>

              {/* Short Description */}
              {selectedProductDetail.description && (
                <div>
                  <h3 className="font-medium text-foreground mb-1">Описание</h3>
                  <p className="text-muted-foreground">{selectedProductDetail.description}</p>
                </div>
              )}

              {/* Detailed Content */}
              {selectedProductDetail.content && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-medium text-foreground mb-2">Подробнее</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: selectedProductDetail.content }}
                  />
                </div>
              )}

              {/* Producer Info */}
              <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                <p>Производитель: {business?.name}</p>
                {ownerProfile?.phone && <p>Телефон: {ownerProfile.phone}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    handleProductSelect(
                      {
                        id: selectedProductDetail.id,
                        name: selectedProductDetail.name,
                        price: selectedProductDetail.price || 0,
                        image: selectedProductDetail.image_url || "",
                      },
                      !isSelected(selectedProductDetail.id)
                    );
                  }}
                  variant={isSelected(selectedProductDetail.id) ? "secondary" : "default"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isSelected(selectedProductDetail.id) ? "Убрать из заказа" : "Добавить в заказ"}
                </Button>
                <Button variant="outline" onClick={() => setProductDetailOpen(false)}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessPage;
