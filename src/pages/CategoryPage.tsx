import { useParams, Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, ChevronLeft, ChevronRight, Phone, ShoppingCart, Filter, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Business, Product as DBProduct } from "@/types/db";

// Mock user profile
const mockAPIUserProfile = {
  phone: "+7 (999) 123-45-67",
};

// Mock order API
const mockAPISendOrder = async (order: { products: SelectedProduct[]; phone: string; businessId: string }) => {
  console.log("Sending order:", order);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true, orderId: `ORD-${Date.now()}` };
};

interface ProductDisplay {
  id: string;
  name: string;
  image: string;
  price: string;
}

interface SelectedProduct extends ProductDisplay {
  businessId: string;
  businessName: string;
}

interface BusinessWithProducts {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string;
  products: ProductDisplay[];
}

interface ProductGridProps {
  products: ProductDisplay[];
  businessName: string;
  businessId: string;
  businessPhone: string;
  selectedProducts: SelectedProduct[];
  onProductClick: (product: ProductDisplay, businessName: string, businessId: string, businessPhone: string) => void;
  onProductSelect: (product: ProductDisplay, businessId: string, businessName: string, selected: boolean) => void;
}

const ProductGrid = ({ 
  products, 
  businessName, 
  businessId, 
  businessPhone, 
  selectedProducts,
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
                  onCheckedChange={(checked) => 
                    onProductSelect(product, businessId, businessName, checked as boolean)
                  }
                  className="mt-1"
                />
                <button
                  onClick={() => onProductClick(product, businessName, businessId, businessPhone)}
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
  } | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState<string | null>(null);
  const [orderPhone, setOrderPhone] = useState(mockAPIUserProfile.phone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialCity = searchParams.get("city") || "Все города";
  const [cityFilter, setCityFilter] = useState(initialCity);

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
      const { data: businessesByCat, error: err1 } = await supabase
        .from("businesses")
        .select("*")
        .eq("category_id", id)
        .eq("status", "published");
      
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
      const producerIds = [...new Set((productsInCat || []).map(p => p.producer_id))];
      
      let businessesByProduct: typeof businessesByCat = [];
      if (producerIds.length > 0) {
        const { data, error: err3 } = await supabase
          .from("businesses")
          .select("*")
          .in("owner_id", producerIds)
          .eq("status", "published");
        
        if (err3) {
          console.error("[Supabase] Error fetching businesses by product:", err3);
        } else {
          businessesByProduct = data || [];
        }
      }

      // 4. Объединяем визитки без дубликатов
      const allBusinessesMap = new Map<string, typeof businessesByCat[0]>();
      (businessesByCat || []).forEach(b => allBusinessesMap.set(b.id, b));
      (businessesByProduct || []).forEach(b => allBusinessesMap.set(b.id, b));
      const allBusinesses = Array.from(allBusinessesMap.values());

      // Собираем уникальные города
      const uniqueCities = new Set<string>(["Все города"]);
      allBusinesses.forEach(b => {
        if (b.city) uniqueCities.add(b.city);
      });
      setCities(Array.from(uniqueCities));

      // 5. Загружаем ВСЕ товары владельцев (не только в этой категории)
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
          products: b.owner_id ? (productsMap[b.owner_id] || []) : [],
        };
      });

      setBusinesses(businessesWithProducts);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleProductClick = (product: ProductDisplay, businessName: string, businessId: string, businessPhone: string) => {
    setSelectedProduct({ product, businessName, businessId, businessPhone });
  };

  const handleProductSelect = (product: ProductDisplay, businessId: string, businessName: string, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, { ...product, businessId, businessName }]);
    } else {
      setSelectedProducts(prev => prev.filter(p => !(p.id === product.id && p.businessId === businessId)));
    }
  };

  const getSelectedForBusiness = (businessId: string) => 
    selectedProducts.filter(p => p.businessId === businessId);

  const handleOrderSubmit = async (businessId: string) => {
    const products = getSelectedForBusiness(businessId);
    if (products.length === 0) return;

    setIsSubmitting(true);
    try {
      await mockAPISendOrder({ products, phone: orderPhone, businessId });
      toast({
        title: "Заказ отправлен",
        description: `Заказ на ${products.length} товар(ов) успешно отправлен производителю`,
      });
      setSelectedProducts(prev => prev.filter(p => p.businessId !== businessId));
      setOrderDialogOpen(null);
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

  const filteredBusinesses = cityFilter === "Все города" 
    ? businesses 
    : businesses.filter(b => b.city === cityFilter);

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
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
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
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Business info - left side */}
                    <div className="flex items-center gap-4 lg:w-72 shrink-0">
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
                      <Button
                        size="sm"
                        disabled={selectedForBusiness.length === 0}
                        onClick={() => setOrderDialogOpen(business.id)}
                        className="shrink-0"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Заказать
                        {selectedForBusiness.length > 0 && (
                          <span className="ml-1 bg-primary-foreground/20 px-1.5 rounded-full text-xs">
                            {selectedForBusiness.length}
                          </span>
                        )}
                      </Button>
                    </div>

                    {/* Products grid - right side */}
                    {business.products.length > 0 && (
                      <div className="flex-1 min-w-0 lg:border-l lg:border-border lg:pl-4">
                        <ProductGrid
                          products={business.products}
                          businessName={business.name}
                          businessId={business.id}
                          businessPhone={business.phone}
                          selectedProducts={selectedProducts}
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
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
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
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${selectedProduct.businessPhone}`}
                    className="text-sm text-foreground hover:text-primary transition-colors"
                  >
                    {selectedProduct.businessPhone}
                  </a>
                </div>
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Телефон для связи</label>
                <Input
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => handleOrderSubmit(orderDialogOpen)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Отправка..." : "Отправить заказ"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CategoryPage;
