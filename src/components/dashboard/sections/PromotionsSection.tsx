import { Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROMO_IMAGE } from "../utils/dashboard-utils";

interface Promotion {
  id: string;
  title: string;
  image_url: string | null;
  discount: string;
  valid_until: string | null;
}

interface PromotionsSectionProps {
  promotions: Promotion[];
  loading: boolean;
  onPromotionClick: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function PromotionsSection({
  promotions,
  loading,
  onPromotionClick,
  onDelete,
  onCreate,
}: PromotionsSectionProps) {
  if (loading) {
    return (
      <div>
        <h2 className="section-title flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Акции
        </h2>
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title flex items-center gap-2">
        <Percent className="h-5 w-5" />
        Акции
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="flex flex-col">
            <button
              onClick={() => onPromotionClick(promotion.id)}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                <img
                  src={promotion.image_url || DEFAULT_PROMO_IMAGE}
                  alt={promotion.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-sm font-medium text-foreground truncate">{promotion.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {promotion.discount}
                </span>
                {promotion.valid_until && (
                  <span className="text-xs text-muted-foreground">
                    до {new Date(promotion.valid_until).toLocaleDateString("ru-RU")}
                  </span>
                )}
              </div>
            </button>
            <div className="flex justify-end mt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(promotion.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {/* Create new promotion */}
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
