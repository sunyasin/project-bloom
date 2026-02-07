import { useParams } from "react-router-dom";
import { TELEGRAM_BOT_USERNAME } from "@/config/telegram";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Tag,
  Package,
  ShoppingCart,
  Bell,
  Loader2,
  MessageCircle,
  Send,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProductSaleType = "sell_only" | "barter_goods" | "barter_coin" | "all";

interface BusinessCard {
  id: string;
  name: string;
  image: string;
  description?: string;
  isMain?: boolean;
  content: string; // HTML string for Jodit
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
  coinPrice: number | null;
}

// Real order API - saves message to database
const sendOrderToOwner = async (order: {
  products: SelectedProduct[];
  quantities: Record<string, number>;
  phone: string;
  address: string;
  businessId: string;
  businessOwnerId: string;
}) => {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Клиент"
    : "Клиент";

  // Format products list with quantities
  const productsList = order.products
    .map((p) => {
      const qty = order.quantities[p.id] || 1;
      return `${p.name} - ${qty} шт.`;
    })
    .join(", ");

  // Build message text
  const message = `${userName} сделал заказ: ${productsList}. Тел: ${order.phone || "не указан"}, Адрес: ${order.address || "не указан"}`;

  // Insert message into database
  const { error } = await supabase.from("messages").insert({
    from_id: user.id,
    to_id: order.businessOwnerId,
    message: message,
    type: "order" as const,
  });

  if (error) {
    throw error;
  }

  return { success: true };
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

  // Lazy load phone/email states
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [loadedPhone, setLoadedPhone] = useState<string | null>(null);
  const [loadedEmail, setLoadedEmail] = useState<string | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);

  // Subscribe to producer news state
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);

  // Digital exchange states
  const [digitalExchangeDialogOpen, setDigitalExchangeDialogOpen] = useState(false);
  const [exchangeMessageSent, setExchangeMessageSent] = useState(false);
  const [exchangeMessage, setExchangeMessage] = useState("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [digitalOfferAmount, setDigitalOfferAmount] = useState<string>("");
  const [digitalProductQuantities, setDigitalProductQuantities] = useState<Record<string, number>>({});

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

        // 4. Профиль владельца (только logo_url, phone/email загружаем по требованию)
        supabase.from("profiles").select("logo_url").eq("user_id", ownerId).maybeSingle(),

        // 5. Акции владельца
        supabase.from("promotions").select("*").eq("owner_id", ownerId).eq("is_active", true),
      ]);

      // Преобразуем визитки в формат BusinessCard
      const cards: BusinessCard[] = (cardsResult.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        image: b.content_json?.image || "",
        description: b.content_json?.description || "",
        content: b.content_json?.content || "",
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

      setLoading(false);
    };

    fetchBusinessData();
  }, [id]);

  // Fetch current user name and products for exchange
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const [profileResult, productsResult] = await Promise.all([
          supabase.from("profiles").select("first_name, last_name, email, phone").eq("user_id", user.id).maybeSingle(),
          supabase.from("products").select("*").eq("producer_id", user.id).eq("is_available", true),
        ]);

        if (profileResult.data) {
          const name =
            [profileResult.data.first_name, profileResult.data.last_name].filter(Boolean).join(" ") ||
            profileResult.data.email ||
            "Аноним";
          setCurrentUserName(name);
            setOrderPhone(profileResult.data.phone || "");
        }

        if (productsResult.data) {
          setUserProducts(productsResult.data as Product[]);
        }
      }
    };
    fetchCurrentUserData();
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
          description: `Вы подписаны на новости ${business?.name}`,
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

  // Function to load contacts on demand
  const loadContacts = async () => {
    if (!business?.owner_id || isLoadingContacts) return;
    
    setIsLoadingContacts(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("phone, email")
        .eq("user_id", business.owner_id)
        .maybeSingle();
      
      if (data) {
        setLoadedPhone(data.phone);
        setLoadedEmail(data.email);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleShowPhone = async () => {
    setShowPhone(true);
    if (!loadedPhone) {
      await loadContacts();
    }
  };

  const handleShowEmail = async () => {
    setShowEmail(true);
    if (!loadedEmail) {
      await loadContacts();
    }
  };

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

    // Check if phone is provided
    if (!orderPhone.trim()) {
      setShowPhoneWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendOrderToOwner({
      products: selectedProducts,
      quantities: orderQuantities,
      phone: orderPhone,
      address: orderAddress,
      businessId: id || "",
      businessOwnerId: business?.owner_id || "",
    });
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
    if (!business?.owner_id || !currentUser?.email) return;

    setIsSubscribing(true);
    try {
      const email = currentUser.email || subscribeEmail;
      if (!email) {
        toast({
          title: "Ошибка",
          description: "Введите email для подписки",
          variant: "destructive",
        });
        return;
      }

      // Check for existing token and delete it
      await supabase
        .from("telegram_subscription_tokens")
        .delete()
        .eq("email", email)
        .eq("type", "producer")
        .eq("entity_id", business.owner_id);

      // Generate unique token
      const token = crypto.randomUUID();
      
      // Save token to database
      const { error: tokenError } = await supabase
        .from("telegram_subscription_tokens")
        .insert({
          email,
          token,
          type: "producer",
          entity_id: business.owner_id,
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
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDigitalExchange = async () => {
    if (selectedProducts.length === 0) return;

    const offerAmount = parseInt(digitalOfferAmount, 10);
    if (!offerAmount || offerAmount <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную сумму долей",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт для обмена",
        variant: "destructive",
      });
      return;
    }

    // Get buyer profile id
    const { data: buyerProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();

    // Get provider profile id
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", business?.owner_id)
      .single();

    if (!buyerProfile || !providerProfile) {
      toast({
        title: "Ошибка",
        description: "Профили не найдены",
        variant: "destructive",
      });
      return;
    }

    // Form provider_items (selected producer's products)
    const providerItems = selectedProducts
      .filter((p) => (digitalProductQuantities[p.id] || 1) > 0)
      .map((p) => ({ item_id: p.id, qty: digitalProductQuantities[p.id] || 1 }));

    // Insert into exchange table with sum (coin exchange)
    const { error: exchangeError } = await supabase.from("exchange").insert({
      creator: buyerProfile.id,
      provider: providerProfile.id,
      type: "coins" as const,
      status: "created" as const,
      buyer_items: [],
      provider_items: providerItems,
      sum: offerAmount,
      comment: null,
    });

    if (exchangeError) {
      console.error("Exchange insert error:", exchangeError);
      toast({
        title: "Ошибка",
        description: "Не удалось создать запрос на обмен",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const productsList = selectedProducts
      .map((p) => {
        const qty = digitalProductQuantities[p.id] || 1;
        return `• ${p.name} — ${qty} шт. (${p.price} ₽/шт)`;
      })
      .join("\n");

    const message = `💰 Предлагаю обмен на доли.\nТовары:\n${productsList}\n\nПредлагаю: ${offerAmount} долей.\n${dateStr}.\nОт кого: ${currentUserName || "Аноним"}.`;

    // Save message to database
    if (business?.owner_id) {
      await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.owner_id,
        message,
        type: "exchange" as const,
      });
    }

    toast({
      title: "Запрос отправлен",
      description: "Производитель получит уведомление о вашем запросе",
    });

    setExchangeMessage(message);
    setDigitalExchangeDialogOpen(false);
    setExchangeMessageSent(true);
    setDigitalOfferAmount("");
    setDigitalProductQuantities({});
  };

  const handleOpenOrderDialog = () => {
    if (selectedProducts.length === 0) return;
    const initialQuantities: Record<string, number> = {};
    selectedProducts.forEach((p) => {
      initialQuantities[p.id] = 1;
    });
    setOrderQuantities(initialQuantities);
    setOrderDialogOpen(true);
  };

  const handleOpenDigitalExchange = () => {
    if (selectedProducts.length === 0) return;
    // Initialize quantities
    const initialQuantities: Record<string, number> = {};
    selectedProducts.forEach((p) => {
      initialQuantities[p.id] = 1;
    });
    setDigitalProductQuantities(initialQuantities);

    // Calculate total coin price for pre-fill
    const totalCoinPrice = selectedProducts.reduce((sum, p) => {
      return sum + (p.coinPrice || p.price || 0);
    }, 0);
    setDigitalOfferAmount(totalCoinPrice > 0 ? String(totalCoinPrice) : "");

    setDigitalExchangeDialogOpen(true);
  };

  const handleOpenGoodsExchange = () => {
    if (selectedProducts.length === 0) return;
    // Initialize producer product quantities for selected products
    const initialQuantities: Record<string, number> = {};
    selectedProducts.forEach((p) => {
      initialQuantities[p.id] = 1;
    });
    setProducerProductQuantities(initialQuantities);
    setUserProductQuantities({});
    setExchangeComment("");
    setGoodsExchangeDialogOpen(true);
  };

  const handleGoodsExchange = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт для обмена",
        variant: "destructive",
      });
      return;
    }

    // Get buyer profile id
    const { data: buyerProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();

    // Get provider profile id
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", business?.owner_id)
      .single();

    if (!buyerProfile || !providerProfile) {
      toast({
        title: "Ошибка",
        description: "Профили не найдены",
        variant: "destructive",
      });
      return;
    }

    // Form buyer_items (user's products)
    const buyerItems = userProducts
      .filter((p) => userProductQuantities[p.id] > 0)
      .map((p) => ({ item_id: p.id, qty: userProductQuantities[p.id] }));

    // Form provider_items (selected producer's products)
    const providerItems = selectedProducts
      .filter((p) => producerProductQuantities[p.id] > 0)
      .map((p) => ({ item_id: p.id, qty: producerProductQuantities[p.id] }));

    // Insert into exchange table
    const { error: exchangeError } = await supabase.from("exchange").insert({
      creator: buyerProfile.id,
      provider: providerProfile.id,
      type: "goods" as const,
      status: "created" as const,
      buyer_items: buyerItems,
      provider_items: providerItems,
      comment: exchangeComment || null,
    });

    if (exchangeError) {
      console.error("Exchange insert error:", exchangeError);
      toast({
        title: "Ошибка",
        description: "Не удалось создать запрос на обмен",
        variant: "destructive",
      });
      return;
    }

    const producerProductsList = selectedProducts
      .filter((p) => producerProductQuantities[p.id] > 0)
      .map((p) => `${p.name} (${producerProductQuantities[p.id]} шт)`)
      .join(", ");

    const userProductsList = userProducts
      .filter((p) => userProductQuantities[p.id] > 0)
      .map((p) => `${p.name} (${userProductQuantities[p.id]} шт)`)
      .join(", ");

    const message = `Запрос обмена от ${currentUserName || "Аноним"}.
Выбраны ваши товары: ${producerProductsList || "не выбраны"}
Предлагаю обмен на: ${userProductsList || "не выбраны"}
Сообщение: ${exchangeComment || "без сообщения"}`;

    // Save message to database
    if (business?.owner_id) {
      await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.owner_id,
        message,
        type: "exchange" as const,
      });
    }

    toast({
      title: "Запрос отправлен",
      description: "Производитель получит уведомление о вашем запросе",
    });

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
        {/* DEBUG: Mobile layout test - add responsive classes */}
        <div className="content-card">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {ownerProfile?.logo_url ? (
                <img src={ownerProfile.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{business.name}</h1>
              <p className="text-primary mt-1 text-sm sm:text-base">{business.category}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{business.location}, {business.city}</span>
              </div>
              {/* Short description from content_json - moved here from separate section */}
              {contentJson.shortDescription && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{contentJson.shortDescription}</p>
              )}
              {/* Contact info - под лого */}
              <div className="space-y-2 mt-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  {showPhone ? (
                    isLoadingContacts ? (
                      <span className="text-sm">Загрузка...</span>
                    ) : loadedPhone ? (
                      <span className="text-foreground font-medium">{loadedPhone}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Не указан</span>
                    )
                  ) : (
                    <button
                      onClick={handleShowPhone}
                      className="text-sm text-primary hover:underline"
                    >
                      Показать телефон
                    </button>
                  )}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  {showEmail ? (
                    isLoadingContacts ? (
                      <span className="text-sm">Загрузка...</span>
                    ) : loadedEmail ? (
                      <span className="text-foreground font-medium truncate">{loadedEmail}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Не указан</span>
                    )
                  ) : (
                    <button
                      onClick={handleShowEmail}
                      className="text-sm text-primary hover:underline truncate"
                    >
                      Показать email
                    </button>
                  )}
                </p>
              </div>
            </div>
            {/* Action buttons - под контактами */}
            <div className="flex gap-2 shrink-0 mt-4 sm:mt-0 sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubscribeDialogOpen(true)}
                disabled={!currentUser}
                title={!currentUser ? "Войдите, чтобы подписаться" : undefined}
              >
                <Bell className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Подписка</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setContactDialogOpen(true)}
                disabled={!currentUser}
                title={!currentUser ? "Войдите, чтобы связаться" : undefined}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Связаться</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Full WYSIWYG content from business card editor */}
        {contentJson?.content && (
          <div className="content-card">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: contentJson.content }}
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
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="sell_only">Только продажа</SelectItem>
                      <SelectItem value="barter_goods">Бартер товар-товар</SelectItem>
                      <SelectItem value="barter_coin">Бартер цифровой</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <Button disabled={selectedProducts.length === 0} onClick={handleOpenOrderDialog}>
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
              <Button variant="outline" disabled={selectedProducts.length === 0} onClick={handleOpenDigitalExchange}>
                Обмен цифровой
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products
                .filter((p) => saleTypeFilter === "all" || (p as any).sale_type === saleTypeFilter)
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
                                coinPrice: (product as any).coin_price || null,
                              },
                              checked as boolean,
                            )
                          }
                        />
                        <span
                          className={`text-xs ${!currentUser ? "text-muted-foreground/50" : "text-muted-foreground"}`}
                        >
                          {!currentUser ? "Войдите" : "Выбрать"}
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
        {businessCards.length > 1 && (
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
                    <Input
                      type="number"
                      min="1"
                      value={orderQuantities[product.id] || 1}
                      onChange={(e) =>
                        setOrderQuantities((prev) => ({
                          ...prev,
                          [product.id]: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-16 h-8 text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-right">
                Итого: {selectedProducts.reduce((sum, p) => sum + p.price * (orderQuantities[p.id] || 1), 0)} ₽
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

      {/* Phone Warning Dialog */}
      <Dialog open={showPhoneWarning} onOpenChange={setShowPhoneWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Внимание</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Без номера телефона поставщик сможет ответить вам только в чате.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneWarning(false)}>
              Вернуться
            </Button>
            <Button onClick={() => {
              setShowPhoneWarning(false);
              handleOrderSubmit();
            }}>
              Отправить
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
              Подпишитесь на новости производителя "{business.name}" и получайте уведомления о новых товарах и акциях в Telegram.
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Подписка через Telegram:</p>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={isSubscribing}
                onClick={handleSubscribe}
              >
                <Send className="h-4 w-4" />
                Подписаться через Telegram
              </Button>
              <p className="text-xs text-muted-foreground">
                Вы будете получать уведомления о новостях производителя в Telegram
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
                {selectedProducts.map((product) => {
                  const displayPrice = product.coinPrice || product.price;
                  const priceLabel = product.coinPrice ? `${product.coinPrice} долей` : `${product.price} ₽`;
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p
                          className={`text-xs ${product.coinPrice ? "text-primary font-semibold" : "text-muted-foreground"}`}
                        >
                          {priceLabel}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={digitalProductQuantities[product.id] || 1}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setDigitalProductQuantities((prev) => ({
                            ...prev,
                            [product.id]: newQty,
                          }));
                          // Update total offer amount when quantity changes
                          const newTotal = selectedProducts.reduce((sum, p) => {
                            const qty = p.id === product.id ? newQty : digitalProductQuantities[p.id] || 1;
                            return sum + (p.coinPrice || p.price || 0) * qty;
                          }, 0);
                          setDigitalOfferAmount(String(newTotal));
                        }}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-semibold">Я предлагаю:</span>
              <Input
                type="number"
                min="1"
                value={digitalOfferAmount}
                onChange={(e) => setDigitalOfferAmount(e.target.value)}
                placeholder="0"
                className="w-24 text-center text-lg font-semibold"
              />
              <span className="text-lg font-semibold">долей</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDigitalExchangeDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleDigitalExchange}>Отправить продавцу</Button>
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
                        onChange={(e) =>
                          setProducerProductQuantities((prev) => ({
                            ...prev,
                            [product.id]: parseInt(e.target.value) || 1,
                          }))
                        }
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
                          onChange={(e) =>
                            setUserProductQuantities((prev) => ({
                              ...prev,
                              [product.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-16 h-8 text-center"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">У вас нет товаров для обмена</p>
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
            <Button onClick={handleGoodsExchange}>Отправить запрос</Button>
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
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg font-mono">{exchangeMessage}</pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setExchangeMessageSent(false)}>Закрыть</Button>
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
                  ...(selectedProductDetail.gallery_urls || []),
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
                          onClick={() => setGalleryIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setGalleryIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
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
                <span className="text-2xl font-bold text-primary">{selectedProductDetail.price || 0} ₽</span>
                <span className="text-muted-foreground">/ {selectedProductDetail.unit || "шт"}</span>
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
                {((selectedProductDetail as any).sale_type === "sell_only" ||
                  !(selectedProductDetail as any).sale_type) && (
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
                <p className="mt-1">
                  {showPhone ? (
                    isLoadingContacts ? (
                      "Загрузка..."
                    ) : loadedPhone ? (
                      <>Телефон: {loadedPhone}</>
                    ) : (
                      "Телефон не указан"
                    )
                  ) : (
                    <button onClick={handleShowPhone} className="text-primary hover:underline">
                      Показать телефон
                    </button>
                  )}
                </p>
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
                        coinPrice: (selectedProductDetail as any).coin_price || null,
                      },
                      !isSelected(selectedProductDetail.id),
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

