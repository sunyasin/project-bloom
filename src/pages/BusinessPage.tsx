import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Phone, Mail, Globe, Tag, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Mock user profile
const mockAPIUserProfile = {
  phone: "+7 (999) 123-45-67",
};

// Mock order API
const mockAPISendOrder = async (order: { products: any[]; phone: string; businessId: string }) => {
  console.log("Sending order:", order);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true, orderId: `ORD-${Date.now()}` };
};

// Mock business cards (визитки производителя)
const mockAPIBusinessCards: Record<string, { id: string; name: string; image: string }[]> = {
  "1": [
    { id: "bc1", name: "Мёд липовый", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
    { id: "bc2", name: "Прополис", image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200&h=200&fit=crop" },
  ],
  "2": [
    { id: "bc3", name: "Молочное хозяйство", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop" },
    { id: "bc4", name: "Сырная мастерская", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
  ],
};

// Mock products (товары производителя)
const mockAPIBusinessProducts: Record<string, { id: string; name: string; price: number; image: string }[]> = {
  "1": [
    { id: "p1", name: "Липовый мёд", price: 850, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
    { id: "p2", name: "Гречишный мёд", price: 750, image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200&h=200&fit=crop" },
    { id: "p3", name: "Цветочный мёд", price: 650, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
    { id: "p4", name: "Прополис", price: 1200, image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200&h=200&fit=crop" },
    { id: "p5", name: "Перга", price: 1500, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
  ],
  "2": [
    { id: "p6", name: "Молоко свежее", price: 95, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
    { id: "p7", name: "Творог 9%", price: 320, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop" },
    { id: "p8", name: "Сыр Гауда", price: 850, image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
    { id: "p9", name: "Сметана", price: 180, image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop" },
    { id: "p10", name: "Кефир", price: 85, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
    { id: "p11", name: "Масло сливочное", price: 450, image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop" },
  ],
};

// Mock business data
const mockBusinessData: Record<string, any> = {
  "1": {
    name: "Пасека Иванова",
    category: "Мёд и продукты пчеловодства",
    location: "Рязанская область, с. Константиново",
    description: "Семейная пасека с 20-летней историей. Производим натуральный мёд, прополис, пергу и другие продукты пчеловодства.",
    phone: "+7 (900) 123-45-67",
    email: "paseka@example.com",
    website: "paseka-ivanova.ru",
    promotions: [
      { id: "1", title: "Скидка 20% на весь мёд", validUntil: "31 января" },
    ],
  },
  "2": {
    name: "Ферма Петровых",
    category: "Молочные продукты",
    location: "Московская область, д. Молоково",
    description: "Производим натуральные молочные продукты из молока собственного стада.",
    phone: "+7 (900) 234-56-78",
    email: "ferma@example.com",
    promotions: [
      { id: "2", title: "Акция 2+1 на сыры", validUntil: "15 февраля" },
    ],
  },
};

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

const BusinessPage = () => {
  const { id } = useParams<{ id: string }>();
  const business = mockBusinessData[id || "1"];
  const businessCards = mockAPIBusinessCards[id || "1"] || [];
  const products = mockAPIBusinessProducts[id || "1"] || [];
  const { toast } = useToast();

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderPhone, setOrderPhone] = useState(mockAPIUserProfile.phone);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await mockAPISendOrder({ products: selectedProducts, phone: orderPhone, businessId: id || "1" });
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="content-card">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
              <p className="text-primary mt-1">{business.category}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {business.location}
              </div>
            </div>
            <Button className="shrink-0">Связаться</Button>
          </div>
        </div>

        {/* Description */}
        <div className="content-card">
          <h2 className="section-title">О производителе</h2>
          <p className="text-muted-foreground">{business.description}</p>
        </div>

        {/* Business Cards (Визитки) */}
        {businessCards.length > 0 && (
          <div>
            <h2 className="section-title">Визитки</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {businessCards.map((card) => (
                <Link
                  key={card.id}
                  to={`/business/${id}`}
                  className="content-card hover:border-primary/30 transition-all hover:shadow-md group p-3"
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
                </Link>
              ))}
            </div>
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
                        onCheckedChange={(checked) => handleProductSelect(product, checked as boolean)}
                      />
                      <span className="text-xs text-muted-foreground">Выбрать</span>
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-primary font-semibold">{product.price} ₽</p>
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
            {business.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{business.phone}</span>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{business.email}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{business.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* Promotions */}
        {business.promotions?.length > 0 && (
          <div className="content-card">
            <h2 className="section-title">Активные акции</h2>
            <div className="space-y-3">
              {business.promotions.map((promo: any) => (
                <div key={promo.id} className="promo-card">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{promo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        до {promo.validUntil}
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Телефон для связи:</label>
              <Input
                value={orderPhone}
                onChange={(e) => setOrderPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOrderDialogOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleOrderSubmit}
                disabled={isSubmitting || selectedProducts.length === 0}
                className="flex-1"
              >
                {isSubmitting ? "Отправка..." : "Отправить заказ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessPage;
