import { useParams, Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Phone, ShoppingCart, Filter, Loader2, Send, ArrowLeftRight, RefreshCw } from "lucide-react";

// Дефолтное изображение для визиток
const DEFAULT_BUSINESS_IMAGE = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop";

// Дефолтное изображение для товаров
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=200&h=200&fit=crop";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import type { Category, Product as DBProduct } from "@/types/db";
import type { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";

type ProductSaleType = 'sell_only' | 'barter_goods' | 'barter_coin' | 'all';

interface ProductDisplay {
  id: string;
  name: string;
  image: string;
  price: string;
  saleTypes: string[];
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
  image: string;
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
  const isSelected = (productId: string) => 
    selectedProducts.some(p => p.id === productId && p.businessId === businessId);

  return (
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
                disabled={!currentUser}
                onCheckedChange={(checked) => 
                  onProductSelect(product, businessId, businessName, ownerId, checked as boolean)
                }
              />
              <span className={`text-xs ${!currentUser ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                {!currentUser ? "Войдите" : "Выбрать"}
              </span>
            </div>
            <button
              onClick={() => onProductClick(product, businessName, businessId, businessPhone, ownerId)}
              className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted cursor-pointer hover:opacity-90 transition-opacity w-full"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </button>
            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
            <p className="text-sm text-primary font-semibold">{product.price}</p>
          </div>
        );
      })}
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

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState<string | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);
  
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
          setUserProducts(productsResult.data as unknown as DBProduct[]);
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
        if (b.city_name) uniqueCities.add(b.city_name);
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
        setCategory(categoryData as Category);
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

      // 2. Загружаем товары с category_id = id (без привязки к визитке)
      const { data: productsInCat, error: err2 } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", id)
        .eq("is_available", true)
        .is("business_card_id", null); // Только товары без привязки к визитке
      
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

      // 5. Загружаем товары для каждой визитки
      // Показываем: товары с business_card_id = визитка.id ИЛИ business_card_id IS NULL
      const businessesWithProducts: BusinessWithProducts[] = await Promise.all(
        allBusinesses.map(async (b) => {
          const contentJson = b.content_json as Record<string, unknown> || {};
          const image = (contentJson.image as string) || DEFAULT_BUSINESS_IMAGE;
          
          // Загружаем товары для этой визитки
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("*")
            .eq("producer_id", b.owner_id)
            .eq("is_available", true)
            .or(`business_card_id.eq.${b.id},business_card_id.is.null`);
          
          if (productsError) {
            console.error("[Supabase] Error fetching products for business", b.id, productsError);
          }
          
          // DEBUG: Log products data structure
          console.log("[DEBUG] Products for business", b.id, "keys:", productsData?.[0] ? Object.keys(productsData[0]) : "no data");
          console.log("[DEBUG] business_card_id present:", productsData?.[0]?.hasOwnProperty("business_card_id"));
          console.log("[DEBUG] coin_price present:", productsData?.[0]?.hasOwnProperty("coin_price"));
          
          const products: ProductDisplay[] = (productsData || []).map(p => ({
            id: p.id,
            name: p.name,
            image: p.image_url || DEFAULT_PRODUCT_IMAGE,
            price: p.price ? `${p.price} ₽${p.unit ? `/${p.unit}` : ""}` : "Цена по запросу",
            saleTypes: (p as any).product_sale_type || ["sell_only"],
            galleryUrls: (p as any).gallery_urls || [],
            description: p.description || "",
            content: (p as any).content || "",
            unit: p.unit || "шт",
            rawPrice: p.price || 0,
            coinPrice: (p as any).coin_price || null,
          }));
          
          return {
            id: b.id,
            name: b.name,
            location: b.location,
            city: b.city_name,
            phone: (contentJson.phone as string) || "",
            ownerId: b.owner_id || "",
            image,
            products,
          };
        })
      );

      setBusinesses(businessesWithProducts);
      setLoading(false);
    };

    fetchData();
  }, [id, cityFilter]);

  const handleProductClick = (product: ProductDisplay, businessName: string, businessId: string, businessPhone: string, ownerId: string) => {
    setSelectedProduct({ product, businessName, businessId, businessPhone, ownerId });
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

    // Check if phone is provided
    if (!orderPhone.trim()) {
      setShowPhoneWarning(true);
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

      const message = `🛒 Новый заказ!
${dateStr}

Товары:
${productsList}

Итого: ${total} ₽
Телефон: ${orderPhone}\n\nОт: ${currentUserName || "Аноним"}`;

      const { error } = await supabase.from("messages").insert({
        from_id: user.id,
        to_id: business.ownerId,
        message,
        type: "order" as const,
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
    
    // Calculate and pre-fill total coin price
    const totalCoinPrice = products.reduce((sum, p) => {
      return sum + (p.coinPrice || p.rawPrice || 0);
    }, 0);
    setDigitalOfferAmount(totalCoinPrice > 0 ? String(totalCoinPrice) : "");
    
    setDigitalExchangeDialogOpen(businessId);
  };

  // Фильтруем товары по типу продажи, затем визитки по городу
  const businessesWithFilteredProducts = businesses.map(b => ({
    ...b,
    products: saleTypeFilter === "all" 
      ? b.products 
      : b.products.filter(p => p.saleTypes.includes(saleTypeFilter))
  }));

  const filteredBusinesses = (cityFilter === "Все города" 
    ? businessesWithFilteredProducts 
    : businessesWithFilteredProducts.filter(b => b.city_name === cityFilter)
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
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                          <img
                            src={business.image}
                            alt={business.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{business.name}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {business.city_name}, {business.location}
                          </div>
                        </div>
                      </Link>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button
                          size="sm"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenOrderDialog(business.id)}
                          className="relative"
                          title="Заказать"
                        >
                          <ShoppingCart className="h-4 w-4 shrink-0" />
                          {selectedForBusiness.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
                              {selectedForBusiness.length}
                            </span>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenGoodsExchange(business.id)}
                          title="Обмен на товары"
                        >
                          <ArrowLeftRight className="h-4 w-4 shrink-0" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedForBusiness.length === 0 || !currentUser}
                          onClick={() => handleOpenDigitalExchange(business.id)}
                          title="Обмен цифровой"
                        >
                          <RefreshCw className="h-4 w-4 shrink-0" />
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

      {/* Unified Product Details Dialog */}
      <ProductDetailsDialog
        open={productDetailOpen}
        onOpenChange={(open) => {
          setProductDetailOpen(open);
          if (!open) setSelectedProduct(null);
        }}
        product={selectedProduct ? {
          id: selectedProduct.product.id,
          name: selectedProduct.product.name,
          image: selectedProduct.product.image,
          price: selectedProduct.product.price,
          rawPrice: selectedProduct.product.rawPrice,
          coinPrice: selectedProduct.product.coinPrice,
          saleTypes: selectedProduct.product.saleTypes,
          description: selectedProduct.product.description,
          content: selectedProduct.product.content,
          unit: selectedProduct.product.unit,
          galleryUrls: selectedProduct.product.galleryUrls,
        } : null}
        businessId={selectedProduct?.businessId || ""}
        businessName={selectedProduct?.businessName || ""}
        ownerId={selectedProduct?.ownerId || ""}
        currentUser={currentUser}
        currentUserName={currentUserName}
        orderPhone={orderPhone}
      />

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
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setDigitalProductQuantities(prev => ({
                            ...prev,
                            [product.id]: newQty
                          }));
                          // Update total offer amount when quantity changes
                          const products = getSelectedForBusiness(digitalExchangeDialogOpen!);
                          const newTotal = products.reduce((sum, p) => {
                            const qty = p.id === product.id ? newQty : (digitalProductQuantities[p.id] || 1);
                            return sum + (p.coinPrice || p.rawPrice || 0) * qty;
                          }, 0);
                          setDigitalOfferAmount(String(newTotal));
                        }}
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

      {/* Order Dialog */}
      <Dialog open={!!orderDialogOpen} onOpenChange={() => setOrderDialogOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
          </DialogHeader>
          {orderDialogOpen && (() => {
            const business = businesses.find(b => b.id === orderDialogOpen);
            const products = getSelectedForBusiness(orderDialogOpen);
            return (
              <div className="space-y-4">
                {/* Business info */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{business?.name}</p>
                  <p className="text-sm text-muted-foreground">{business?.city_name}, {business?.location}</p>
                </div>

                {/* Products list */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Выбранные товары:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.rawPrice} ₽/{product.unit}</p>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          value={orderQuantities[product.id] || 1}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            setOrderQuantities(prev => ({
                              ...prev,
                              [product.id]: newQty
                            }));
                          }}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-sm text-muted-foreground">шт.</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Итого:</p>
                  <p className="text-xl font-bold">
                    {products.reduce((sum, p) => sum + p.rawPrice * (orderQuantities[p.id] || 1), 0)} ₽
                  </p>
                </div>

                {/* Phone input */}
                <div className="space-y-2">
                  <Label htmlFor="order-phone">Телефон для связи</Label>
                  <Input
                    id="order-phone"
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(null)}>
              Отмена
            </Button>
            <Button onClick={() => orderDialogOpen && handleOrderSubmit(orderDialogOpen)} disabled={isSubmitting}>
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
              if (orderDialogOpen) {
                handleOrderSubmit(orderDialogOpen);
              }
            }}>
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CategoryPage;
