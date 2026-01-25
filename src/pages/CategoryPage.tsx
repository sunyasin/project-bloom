import { useParams, Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, ChevronLeft, ChevronRight, Phone, ShoppingCart, Filter, Loader2, Send } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Product as DBProduct } from "@/types/db";
import type { User } from "@supabase/supabase-js";

type ProductSaleType = 'sell_only' | 'barter_goods' | 'barter_coin' | 'all';

interface ProductDisplay {
  id: string;
  name: string;
  image: string;
  price: string;
  saleType: string;
  galleryUrls: string[];
  description: string;
  content: string;
  unit: string;
  rawPrice: number;
  coinPrice: number | null;
}

interface SelectedProduct extends ProductDisplay {
  businessId: string;
  businessName: string;
  ownerId: string;
}

interface BusinessWithProducts {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string;
  ownerId: string;
  products: ProductDisplay[];
}

interface ProductGridProps {
  products: ProductDisplay[];
  businessName: string;
  businessId: string;
  businessPhone: string;
  ownerId: string;
  selectedProducts: SelectedProduct[];
  currentUser: User | null;
  onProductClick: (product: ProductDisplay, businessName: string, businessId: string, businessPhone: string, ownerId: string) => void;
  onProductSelect: (product: ProductDisplay, businessId: string, businessName: string, ownerId: string, selected: boolean) => void;
}

const ProductGrid = ({ 
  products, 
  businessName, 
  businessId, 
  businessPhone, 
  ownerId,
  selectedProducts,
  currentUser,
  onProductClick, 
  onProductSelect 
}: ProductGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(products.length > 5);

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(updateScrollButtons, 300);
    }
  };

  const isSelected = (productId: string) => 
    selectedProducts.some(p => p.id === productId && p.businessId === businessId);

  return (
    <div className="relative flex items-center gap-2">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 h-8 w-8 flex items-center justify-center bg-background/90 border border-border rounded-full shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => {
          const selected = isSelected(product.id);
          return (
            <div
              key={product.id}
              className={`flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg transition-all ${
                selected ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-1">
                <Checkbox
                  checked={selected}
                  disabled={!currentUser}
                  onCheckedChange={(checked) => 
                    onProductSelect(product, businessId, businessName, ownerId, checked as boolean)
                  }
                  className="mt-1"
                />
                <button
                  onClick={() => onProductClick(product, businessName, businessId, businessPhone, ownerId)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors w-14 text-center truncate">
                    {product.name}
                  </span>
                  <span className="text-xs font-medium text-primary w-14 text-center truncate">
                    {product.price}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 h-8 w-8 flex items-center justify-center bg-background/90 border border-border rounded-full shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>(["Все города"]);
  
  const [selectedProduct, setSelectedProduct] = useState<{
    product: ProductDisplay;
    businessName: string;
    businessId: string;
    businessPhone: string;
    ownerId: string;
  } | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState<string | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialCity = searchParams.get("city") || "Все города";
  const [cityFilter, setCityFilter] = useState(initialCity);
  const [saleTypeFilter, setSaleTypeFilter] = useState<ProductSaleType>("all");

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [userProducts, setUserProducts] = useState<DBProduct[]>([]);

  // Digital exchange states
  const [digitalExchangeDialogOpen, setDigitalExchangeDialogOpen] = useState<string | null>(null);
  const [digitalOfferAmount, setDigitalOfferAmount] = useState<string>("");
  const [digitalProductQuantities, setDigitalProductQuantities] = useState<Record<string, number>>({});

  // Goods exchange states
  const [goodsExchangeDialogOpen, setGoodsExchangeDialogOpen] = useState<string | null>(null);
  const [producerProductQuantities, setProducerProductQuantities] = useState<Record<string, number>>({});
  const [userProductQuantities, setUserProductQuantities] = useState<Record<string, number>>({});
  const [exchangeComment, setExchangeComment] = useState("");

  // Exchange message sent confirmation
  const [exchangeMessageSent, setExchangeMessageSent] = useState(false);
  const [exchangeMessage, setExchangeMessage] = useState("");

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

  // Fetch current user data for exchange
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [profileResult, productsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name, last_name, email, phone")
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
          setOrderPhone(profileResult.data.phone || "");
        }
        
        if (productsResult.data) {
          setUserProducts(productsResult.data as DBProduct[]);
        }
      }
    };
    fetchCurrentUserData();
  }, [currentUser]);

  // Загрузка городов из БД
  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("city")
        .eq("status", "published")
        .not("city", "is", null)
        .neq("city", "");
      
      if (error) {
        console.error("[Supabase] Error fetching cities:", error);
        return;
      }
      
      const uniqueCities = new Set<string>();
      data?.forEach(b => {
        if (b.city) uniqueCities.add(b.city);
      });
      
      setCities(["Все города", ...Array.from(uniqueCities).sort()]);
    };
    
    fetchCities();
  }, []);

  // Загрузка данных из БД
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      
      // Загружаем категорию
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (categoryError) {
        console.error("[Supabase] Error fetching category:", categoryError);
      } else if (categoryData) {
        setCategory(categoryData);
      }

      // 1. Загружаем визитки с category_id = id
      let businessQuery = supabase
        .from("businesses")
        .select("*")
        .eq("category_id", id)
        .eq("status", "published");
      
      // Применяем фильтр по городу
      if (cityFilter && cityFilter !== "Все города") {
        businessQuery = businessQuery.eq("city", cityFilter);
      }
      
      const { data: businessesByCat, error: err1 } = await businessQuery;
      
      if (err1) {
        console.error("[Supabase] Error fetching businesses by category:", err1);
      }

      // 2. Загружаем товары с category_id = id
      const { data: productsInCat, error: err2 } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", id)
        .eq("is_available", true);
      
      if (err2) {
        console.error("[Supabase] Error fetching products by category:", err2);
      }

      // 3. Собираем producer_id из товаров и загружаем их визитки
      const producerIds = [...new Set((productsInCat || []).map((p) => p.producer_id))];

      let businessesByProduct: typeof businessesByCat = [];
      if (producerIds.length > 0) {
        let productBusinessQuery = supabase
          .from("businesses")
          .select("*")
          .in("owner_id", producerIds)
          .eq("status", "published");
        
        // Применяем фильтр по городу
        if (cityFilter && cityFilter !== "Все города") {
          productBusinessQuery = productBusinessQuery.eq("city", cityFilter);
        }

        const { data, error: err3 } = await productBusinessQuery;

        if (err3) {
          console.error("[Supabase] Error fetching businesses by product:", err3);
        } else {
          businessesByProduct = data || [];
        }
      }

      // 4. Объединяем в список производителей без дублей по owner_id.
      const pickBetter = (
        a: (typeof businessesByCat)[0] | undefined,
        b: (typeof businessesByCat)[0]
      ) => {
        if (!a) return b;
        const aInCat = a.category_id === id;
        const bInCat = b.category_id === id;
        if (aInCat !== bInCat) return bInCat ? b : a;

        const aTime = new Date((a.updated_at || a.created_at) as string).getTime();
        const bTime = new Date((b.updated_at || b.created_at) as string).getTime();
        return bTime > aTime ? b : a;
      };

      const byOwner = new Map<string, (typeof businessesByCat)[0]>();
      [...(businessesByCat || []), ...(businessesByProduct || [])].forEach((b) => {
        if (!b.owner_id) return;
        byOwner.set(b.owner_id, pickBetter(byOwner.get(b.owner_id), b));
      });

      const allBusinesses = Array.from(byOwner.values());

      // 5. Загружаем ВСЕ товары владельцев
      const ownerIds = allBusinesses.map(b => b.owner_id).filter(Boolean) as string[];
      
      let productsMap: Record<string, ProductDisplay[]> = {};
      
      if (ownerIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .in("producer_id", ownerIds)
          .eq("is_available", true);
        
        if (productsError) {
          console.error("[Supabase] Error fetching products:", productsError);
        } else if (productsData) {
          // Группируем товары по producer_id
          productsData.forEach(p => {
            if (!productsMap[p.producer_id]) {
              productsMap[p.producer_id] = [];
            }
            productsMap[p.producer_id].push({
              id: p.id,
              name: p.name,
              image: p.image_url || "/placeholder.svg",
              price: p.price ? `${p.price} ₽${p.unit ? `/${p.unit}` : ""}` : "Цена по запросу",
              saleType: (p as any).sale_type || "sell_only",
              galleryUrls: (p as any).gallery_urls || [],
              description: p.description || "",
              content: (p as any).content || "",
              unit: p.unit || "шт",
              rawPrice: p.price || 0,
              coinPrice: (p as any).coin_price || null,
            });
          });
        }
      }

      // Формируем массив визиток с товарами
      const businessesWithProducts: BusinessWithProducts[] = allBusinesses.map(b => {
        const contentJson = b.content_json as Record<string, unknown> || {};
        return {
          id: b.id,
          name: b.name,
          location: b.location,
          city: b.city,
          phone: (contentJson.phone as string) || "",
          ownerId: b.owner_id || "",
          products: b.owner_id ? (productsMap[b.owner_id] || []) : [],
        };
      });

      setBusinesses(businessesWithProducts);
      setLoading(false);
    };

    fetchData();
  }, [id, cityFilter]);

  const handleProductClick = (product: ProductDisplay, businessName: string, businessId: string, businessPhone: string, ownerId: string) => {
    setSelectedProduct({ product, businessName, businessId, businessPhone, ownerId });
    setGalleryIndex(0);
    setProductDetailOpen(true);
  };

  const handleProductSelect = (product: ProductDisplay, businessId: string, businessName: string, ownerId: string, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, { ...product, businessId, businessName, ownerId }]);
    } else {
      setSelectedProducts(prev => prev.filter(p => !(p.id === product.id && p.businessId === businessId)));
    }
  };

  const getSelectedForBusiness = (businessId: string) => 
    selectedProducts.filter(p => p.businessId === businessId);

  // Real order submission via messages
  const handleOrderSubmit = async (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт для заказа",
        variant: "destructive",
      });
      return;
    }

    const business = businesses.find(b => b.id === businessId);
    if (!business?.ownerId) {
      toast({
        title: "Ошибка",
        description: "Производитель не найден",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const productsList = products
        .map((p) => {
          const qty = orderQuantities[p.id] || 1;
          return `• ${p.name} — ${qty} ${p.unit} (${p.rawPrice} ₽/${p.unit})`;
        })
        .join("\n");

      const total = products.reduce((sum, p) => sum + p.rawPrice * (orderQuantities[p.id] || 1), 0);

      const message = `🛒 Новый заказ!\n${dateStr}\n\nТовары:\n${productsList}\n\nИтого: ${total} ₽\nТелефон: ${orderPhone}\n\nОт: ${currentUserName || "Аноним"}`;

      const { error } = await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.ownerId,
        message,
        type: "chat" as const,
      });

      if (error) throw error;

      toast({
        title: "Заказ отправлен",
        description: `Заказ на ${products.length} товар(ов) успешно отправлен производителю`,
      });
      setSelectedProducts(prev => prev.filter(p => p.businessId !== businessId));
      setOrderDialogOpen(null);
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заказ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Digital exchange handler
  const handleDigitalExchange = async (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;
    
    const offerAmount = parseInt(digitalOfferAmount, 10);
    if (!offerAmount || offerAmount <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную сумму долей",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт для обмена",
        variant: "destructive",
      });
      return;
    }

    const business = businesses.find(b => b.id === businessId);
    if (!business?.ownerId) {
      toast({
        title: "Ошибка",
        description: "Производитель не найден",
        variant: "destructive",
      });
      return;
    }

    // Get buyer profile id
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    // Get provider profile id
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", business.ownerId)
      .single();

    if (!buyerProfile || !providerProfile) {
      toast({
        title: "Ошибка",
        description: "Профили не найдены",
        variant: "destructive",
      });
      return;
    }

    // Form provider_items
    const providerItems = products
      .filter(p => (digitalProductQuantities[p.id] || 1) > 0)
      .map(p => ({ item_id: p.id, qty: digitalProductQuantities[p.id] || 1 }));

    // Insert into exchange table
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
    
    const productsList = products
      .map((p) => {
        const qty = digitalProductQuantities[p.id] || 1;
        return `• ${p.name} — ${qty} шт. (${p.rawPrice} ₽/шт)`;
      })
      .join("\n");
    
    const message = `💰 Предлагаю обмен на доли.\nТовары:\n${productsList}\n\nПредлагаю: ${offerAmount} долей.\n${dateStr}.\nОт кого: ${currentUserName || "Аноним"}.`;
    
    // Save message to database
    await supabase.from("messages").insert({
      from_id: user.id,
      to_id: business.ownerId,
      message,
      type: "exchange" as const,
    });

    toast({
      title: "Запрос отправлен",
      description: "Производитель получит уведомление о вашем запросе",
    });
    
    setExchangeMessage(message);
    setDigitalExchangeDialogOpen(null);
    setExchangeMessageSent(true);
    setDigitalOfferAmount("");
    setDigitalProductQuantities({});
    setSelectedProducts(prev => prev.filter(p => p.businessId !== businessId));
  };

  // Goods exchange handler
  const handleGoodsExchange = async (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт для обмена",
        variant: "destructive",
      });
      return;
    }

    const business = businesses.find(b => b.id === businessId);
    if (!business?.ownerId) {
      toast({
        title: "Ошибка",
        description: "Производитель не найден",
        variant: "destructive",
      });
      return;
    }

    // Get buyer profile id
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    // Get provider profile id
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", business.ownerId)
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
      .filter(p => userProductQuantities[p.id] > 0)
      .map(p => ({ item_id: p.id, qty: userProductQuantities[p.id] }));

    // Form provider_items (selected producer's products)
    const providerItems = products
      .filter(p => producerProductQuantities[p.id] > 0)
      .map(p => ({ item_id: p.id, qty: producerProductQuantities[p.id] }));

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

    const producerProductsList = products
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
    await supabase.from("messages").insert({
      from_id: user.id,
      to_id: business.ownerId,
      message,
      type: "exchange" as const,
    });
    
    toast({
      title: "Запрос отправлен",
      description: "Производитель получит уведомление о вашем запросе",
    });
    
    setExchangeMessage(message);
    setGoodsExchangeDialogOpen(null);
    setExchangeMessageSent(true);
    setSelectedProducts(prev => prev.filter(p => p.businessId !== businessId));
  };

  const handleOpenOrderDialog = (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;
    const initialQuantities: Record<string, number> = {};
    products.forEach(p => {
      initialQuantities[p.id] = 1;
    });
    setOrderQuantities(initialQuantities);
    setOrderDialogOpen(businessId);
  };

  const handleOpenGoodsExchange = (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;
    const initialQuantities: Record<string, number> = {};
    products.forEach(p => {
      initialQuantities[p.id] = 1;
    });
    setProducerProductQuantities(initialQuantities);
    setUserProductQuantities({});
    setExchangeComment("");
    setGoodsExchangeDialogOpen(businessId);
  };

  const handleOpenDigitalExchange = (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;
    const initialQuantities: Record<string, number> = {};
    products.forEach(p => {
      initialQuantities[p.id] = 1;
    });
    setDigitalProductQuantities(initialQuantities);
    setDigitalOfferAmount("");
    setDigitalExchangeDialogOpen(businessId);
  };

  // Фильтруем товары по типу продажи, затем визитки по городу
  const businessesWithFilteredProducts = businesses.map(b => ({
    ...b,
    products: saleTypeFilter === "all" 
      ? b.products 
      : b.products.filter(p => p.saleType === saleTypeFilter)
  }));

  const filteredBusinesses = (cityFilter === "Все города" 
    ? businessesWithFilteredProducts 
    : businessesWithFilteredProducts.filter(b => b.city === cityFilter)
  ).filter(b => b.products.length > 0 || saleTypeFilter === "all");

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const categoryName = category?.name || "Категория";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
            <p className="text-muted-foreground mt-1">
              Производители в категории «{categoryName}»
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Город" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        {filteredBusinesses.length > 0 ? (
          <div className="space-y-4">
            {filteredBusinesses.map((business) => {
              const selectedForBusiness = getSelectedForBusiness(business.id);
              
              return (
                <div
                  key={business.id}
                  className="content-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col gap-4">
                    {/* Business info and buttons row */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <Link
                        to={`/business/${business.id}`}
                        className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{business.name}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {business.location}
                          </div>
                        </div>
                      </Link>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button
                          size="sm"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenOrderDialog(business.id)}
                          title={!currentUser ? "Войдите для заказа" : undefined}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Заказать
                          {selectedForBusiness.length > 0 && (
                            <span className="ml-1 bg-primary-foreground/20 px-1.5 rounded-full text-xs">
                              {selectedForBusiness.length}
                            </span>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenGoodsExchange(business.id)}
                          title={!currentUser ? "Войдите для обмена" : undefined}
                        >
                          Обмен на товары
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenDigitalExchange(business.id)}
                          title={!currentUser ? "Войдите для обмена" : undefined}
                        >
                          Обмен цифровой
                        </Button>
                      </div>
                    </div>

                    {/* Products grid */}
                    {business.products.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <ProductGrid
                          products={business.products}
                          businessName={business.name}
                          businessId={business.id}
                          businessPhone={business.phone}
                          ownerId={business.ownerId}
                          selectedProducts={selectedProducts}
                          currentUser={currentUser}
                          onProductClick={handleProductClick}
                          onProductSelect={handleProductSelect}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              В этой категории пока нет производителей
            </p>
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={!!selectedProduct && !productDetailOpen} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedProduct?.product.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedProduct.product.image.replace("w=100&h=100", "w=300&h=300")}
                  alt={selectedProduct.product.name}
                  className="w-48 h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="text-center">
                <p className="text-xl font-semibold text-primary">{selectedProduct.product.price}</p>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Производитель: </span>
                  <Link
                    to={`/business/${selectedProduct.businessId}`}
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => setSelectedProduct(null)}
                  >
                    {selectedProduct.businessName}
                  </Link>
                </div>
                
                {selectedProduct.businessPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${selectedProduct.businessPhone}`}
                      className="text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {selectedProduct.businessPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={!!orderDialogOpen} onOpenChange={() => setOrderDialogOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
          </DialogHeader>
          
          {orderDialogOpen && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Выбранные товары:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getSelectedForBusiness(orderDialogOpen).map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-primary">{product.price}</p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={orderQuantities[product.id] || 1}
                        onChange={(e) => setOrderQuantities(prev => ({
                          ...prev,
                          [product.id]: Math.max(1, parseInt(e.target.value) || 1)
                        }))}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-right">
                  Итого: {getSelectedForBusiness(orderDialogOpen).reduce((sum, p) => sum + p.rawPrice * (orderQuantities[p.id] || 1), 0)} ₽
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон для связи</Label>
                <Input
                  id="phone"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => orderDialogOpen && handleOrderSubmit(orderDialogOpen)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Отправка..." : "Отправить заказ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog with Gallery */}
      <Dialog open={productDetailOpen} onOpenChange={setProductDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.product.name || "Товар"}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Image Gallery */}
              {(() => {
                const allImages = [
                  selectedProduct.product.image,
                  ...selectedProduct.product.galleryUrls
                ].filter(Boolean);
                
                if (allImages.length === 0) return null;
                
                return (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={allImages[galleryIndex] || allImages[0]} 
                        alt={selectedProduct.product.name} 
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
                  {selectedProduct.product.rawPrice || 0} ₽
                </span>
                <span className="text-muted-foreground">
                  / {selectedProduct.product.unit}
                </span>
              </div>

              {/* Sale Type Badge */}
              <div>
                {selectedProduct.product.saleType === "barter_goods" && (
                  <span className="inline-block text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded">
                    Бартер товар-товар
                  </span>
                )}
                {selectedProduct.product.saleType === "barter_coin" && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                    Бартер цифровой
                  </span>
                )}
                {(selectedProduct.product.saleType === "sell_only" || !selectedProduct.product.saleType) && (
                  <span className="inline-block text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                    Только продажа
                  </span>
                )}
              </div>

              {/* Short Description */}
              {selectedProduct.product.description && (
                <div>
                  <h3 className="font-medium text-foreground mb-1">Описание</h3>
                  <p className="text-muted-foreground">{selectedProduct.product.description}</p>
                </div>
              )}

              {/* Detailed Content */}
              {selectedProduct.product.content && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-medium text-foreground mb-2">Подробнее</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: selectedProduct.product.content }}
                  />
                </div>
              )}

              {/* Producer Info */}
              <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                <p>Производитель: {selectedProduct.businessName}</p>
                {selectedProduct.businessPhone && <p>Телефон: {selectedProduct.businessPhone}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  disabled={!currentUser}
                  onClick={() => {
                    const isCurrentlySelected = selectedProducts.some(
                      p => p.id === selectedProduct.product.id && p.businessId === selectedProduct.businessId
                    );
                    handleProductSelect(
                      selectedProduct.product,
                      selectedProduct.businessId,
                      selectedProduct.businessName,
                      selectedProduct.ownerId,
                      !isCurrentlySelected
                    );
                  }}
                  variant={selectedProducts.some(
                    p => p.id === selectedProduct.product.id && p.businessId === selectedProduct.businessId
                  ) ? "secondary" : "default"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {selectedProducts.some(
                    p => p.id === selectedProduct.product.id && p.businessId === selectedProduct.businessId
                  ) ? "Убрать из заказа" : "Добавить в заказ"}
                </Button>
                <Button variant="outline" onClick={() => setProductDetailOpen(false)}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Digital Exchange Dialog */}
      <Dialog open={!!digitalExchangeDialogOpen} onOpenChange={() => setDigitalExchangeDialogOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Обмен цифровой</DialogTitle>
          </DialogHeader>
          {digitalExchangeDialogOpen && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Выбранные товары:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getSelectedForBusiness(digitalExchangeDialogOpen).map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-2">
                          {product.coinPrice ? (
                            <p className="text-xs font-semibold text-primary">{product.coinPrice} долей</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{product.rawPrice} ₽</p>
                          )}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={digitalProductQuantities[product.id] || 1}
                        onChange={(e) => setDigitalProductQuantities(prev => ({
                          ...prev,
                          [product.id]: parseInt(e.target.value) || 1
                        }))}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Show total suggested coin price */}
              {(() => {
                const products = getSelectedForBusiness(digitalExchangeDialogOpen);
                const totalCoinPrice = products.reduce((sum, p) => {
                  const qty = digitalProductQuantities[p.id] || 1;
                  return sum + (p.coinPrice ? p.coinPrice * qty : 0);
                }, 0);
                
                return totalCoinPrice > 0 ? (
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">Рекомендуемая цена продавца:</p>
                    <p className="text-xl font-bold text-primary">{totalCoinPrice} долей</p>
                  </div>
                ) : null;
              })()}
              
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDigitalExchangeDialogOpen(null)}>
              Отмена
            </Button>
            <Button onClick={() => digitalExchangeDialogOpen && handleDigitalExchange(digitalExchangeDialogOpen)}>
              Отправить продавцу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goods Exchange Dialog */}
      <Dialog open={!!goodsExchangeDialogOpen} onOpenChange={() => setGoodsExchangeDialogOpen(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Обмен на товары</DialogTitle>
          </DialogHeader>
          {goodsExchangeDialogOpen && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Left column - Producer products */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Товары производителя</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getSelectedForBusiness(goodsExchangeDialogOpen).map((product) => (
                      <div key={product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-primary">{product.rawPrice} ₽</p>
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoodsExchangeDialogOpen(null)}>
              Отмена
            </Button>
            <Button onClick={() => goodsExchangeDialogOpen && handleGoodsExchange(goodsExchangeDialogOpen)}>
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
    </MainLayout>
  );
};

export default CategoryPage;
