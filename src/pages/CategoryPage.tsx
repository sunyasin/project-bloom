import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, ChevronLeft, ChevronRight, Phone, ShoppingCart, Filter } from "lucide-react";
import { useState, useRef } from "react";
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

// Mock products data
const mockAPIProducts: Record<string, { id: string; name: string; image: string; price: string }[]> = {
  "2": [
    { id: "p1", name: "Сыр Гауда", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=100&h=100&fit=crop", price: "850 ₽/кг" },
    { id: "p2", name: "Молоко 3.2%", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop", price: "95 ₽/л" },
    { id: "p3", name: "Творог 9%", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100&h=100&fit=crop", price: "320 ₽/кг" },
    { id: "p4", name: "Сметана", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=100&h=100&fit=crop", price: "180 ₽" },
    { id: "p5", name: "Масло сливочное", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=100&h=100&fit=crop", price: "450 ₽" },
    { id: "p6", name: "Кефир", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop", price: "85 ₽/л" },
    { id: "p7", name: "Ряженка", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop", price: "90 ₽" },
    { id: "p8", name: "Йогурт натуральный", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100&h=100&fit=crop", price: "120 ₽" },
    { id: "p9", name: "Сыр Моцарелла", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=100&h=100&fit=crop", price: "950 ₽/кг" },
    { id: "p10", name: "Сливки 20%", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop", price: "210 ₽" },
    { id: "p11", name: "Сыр Бри", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=100&h=100&fit=crop", price: "1200 ₽/кг" },
    { id: "p12", name: "Простокваша", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop", price: "75 ₽" },
  ],
  "5": [
    { id: "p13", name: "Кефир 2.5%", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop", price: "80 ₽/л" },
    { id: "p14", name: "Сметана 20%", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=100&h=100&fit=crop", price: "195 ₽" },
    { id: "p15", name: "Масло топлёное", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=100&h=100&fit=crop", price: "520 ₽" },
    { id: "p16", name: "Творог 5%", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100&h=100&fit=crop", price: "290 ₽/кг" },
    { id: "p17", name: "Молоко козье", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop", price: "180 ₽/л" },
    { id: "p18", name: "Сыр Адыгейский", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=100&h=100&fit=crop", price: "680 ₽/кг" },
  ],
};

// Mock category data with phone and city
const mockAPICategoryData: Record<string, { name: string; businesses: { id: string; name: string; location: string; city: string; phone: string }[] }> = {
  "1": {
    name: "Молочные продукты",
    businesses: [
      { id: "2", name: "Ферма Петровых", location: "Московская область", city: "Коломна", phone: "+7 (495) 123-45-67" },
      { id: "5", name: "Молочный край", location: "Тульская область", city: "Тула", phone: "+7 (487) 765-43-21" },
      { id: "6", name: "Сырный дом", location: "Московская область", city: "Коломна", phone: "+7 (495) 111-22-33" },
      { id: "7", name: "Деревенское подворье", location: "Рязанская область", city: "Рязань", phone: "+7 (491) 222-33-44" },
    ],
  },
};

// Mock API для получения списка городов (GET /api/cities)
const mockAPIGetCities = async () => {
  console.log("[mockAPI] GET /api/cities");
  return ["Все города", "Коломна", "Тула", "Рязань"];
};

interface Product {
  id: string;
  name: string;
  image: string;
  price: string;
}

interface SelectedProduct extends Product {
  businessId: string;
  businessName: string;
}

interface ProductGridProps {
  products: Product[];
  businessName: string;
  businessId: string;
  businessPhone: string;
  selectedProducts: SelectedProduct[];
  onProductClick: (product: Product, businessName: string, businessId: string, businessPhone: string) => void;
  onProductSelect: (product: Product, businessId: string, businessName: string, selected: boolean) => void;
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
  const category = mockAPICategoryData[id || "1"] || { name: "Категория", businesses: [] };
  const { toast } = useToast();
  
  const [selectedProduct, setSelectedProduct] = useState<{
    product: Product;
    businessName: string;
    businessId: string;
    businessPhone: string;
  } | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState<string | null>(null);
  const [orderPhone, setOrderPhone] = useState(mockAPIUserProfile.phone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cityFilter, setCityFilter] = useState("Все города");
  const cities = ["Все города", "Коломна", "Тула", "Рязань"]; // В реальном приложении - из mockAPIGetCities

  const handleProductClick = (product: Product, businessName: string, businessId: string, businessPhone: string) => {
    setSelectedProduct({ product, businessName, businessId, businessPhone });
  };

  const handleProductSelect = (product: Product, businessId: string, businessName: string, selected: boolean) => {
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
    ? category.businesses 
    : category.businesses.filter(b => b.city === cityFilter);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
            <p className="text-muted-foreground mt-1">
              Производители в категории «{category.name}»
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
              const products = mockAPIProducts[business.id] || [];
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
                    {products.length > 0 && (
                      <div className="flex-1 min-w-0 lg:border-l lg:border-border lg:pl-4">
                        <ProductGrid
                          products={products}
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
