import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, ChevronLeft, ChevronRight, X, Phone } from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Mock category data with phone
const mockAPICategoryData: Record<string, { name: string; businesses: { id: string; name: string; location: string; phone: string }[] }> = {
  "1": {
    name: "Молочные продукты",
    businesses: [
      { id: "2", name: "Ферма Петровых", location: "Московская область", phone: "+7 (495) 123-45-67" },
      { id: "5", name: "Молочный край", location: "Тульская область", phone: "+7 (487) 765-43-21" },
    ],
  },
};

interface Product {
  id: string;
  name: string;
  image: string;
  price: string;
}

interface ProductGridProps {
  products: Product[];
  businessName: string;
  businessId: string;
  businessPhone: string;
  onProductClick: (product: Product, businessName: string, businessId: string, businessPhone: string) => void;
}

const ProductGrid = ({ products, businessName, businessId, businessPhone, onProductClick }: ProductGridProps) => {
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
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductClick(product, businessName, businessId, businessPhone)}
            className="flex-shrink-0 flex flex-col items-center gap-1 group cursor-pointer"
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
          </button>
        ))}
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
  
  const [selectedProduct, setSelectedProduct] = useState<{
    product: Product;
    businessName: string;
    businessId: string;
    businessPhone: string;
  } | null>(null);

  const handleProductClick = (product: Product, businessName: string, businessId: string, businessPhone: string) => {
    setSelectedProduct({ product, businessName, businessId, businessPhone });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
          <p className="text-muted-foreground mt-1">
            Производители в категории «{category.name}»
          </p>
        </div>

        {category.businesses.length > 0 ? (
          <div className="space-y-4">
            {category.businesses.map((business) => {
              const products = mockAPIProducts[business.id] || [];
              
              return (
                <div
                  key={business.id}
                  className="content-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Business info - left side */}
                    <Link
                      to={`/business/${business.id}`}
                      className="flex items-center gap-4 lg:w-64 shrink-0 hover:opacity-80 transition-opacity"
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

                    {/* Products grid - right side */}
                    {products.length > 0 && (
                      <div className="flex-1 min-w-0 lg:border-l lg:border-border lg:pl-4">
                        <ProductGrid
                          products={products}
                          businessName={business.name}
                          businessId={business.id}
                          businessPhone={business.phone}
                          onProductClick={handleProductClick}
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
    </MainLayout>
  );
};

export default CategoryPage;
