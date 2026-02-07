import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRODUCT_IMAGE } from "../utils/dashboard-utils";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
}

interface ProductsSectionProps {
  products: Product[];
  loading: boolean;
  onProductClick: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => Promise<void>;
}

export function ProductsSection({
  products,
  loading,
  onProductClick,
  onDelete,
  onCreate,
}: ProductsSectionProps) {
  if (loading) {
    return (
      <div>
        <h2 className="section-title flex items-center gap-2">
          <Package className="h-5 w-5" />
          Товары
        </h2>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title flex items-center gap-2">
        <Package className="h-5 w-5" />
        Товары
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col">
            <button
              onClick={() => onProductClick(product.id)}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                <img
                  src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
              <p className="text-sm text-primary font-semibold">{product.price || 0} ₽</p>
            </button>
            <div className="flex justify-end mt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(product.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {/* Create new product */}
        <button
          onClick={onCreate}
          className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Создать</p>
        </button>
      </div>
    </div>
  );
}
