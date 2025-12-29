import { Tag, Sparkles } from "lucide-react";

// Mock promotions data
const mockPromotions = [
  {
    id: "1",
    title: "Скидка 20% на мёд",
    business: "Пасека Иванова",
    validUntil: "31 января",
  },
  {
    id: "2",
    title: "2+1 на сыры",
    business: "Ферма Петровых",
    validUntil: "15 февраля",
  },
  {
    id: "3",
    title: "Бесплатная доставка",
    business: "Эко-овощи",
    validUntil: "28 января",
  },
];

export const RightSidebar = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Promotions Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Актуальные акции</h3>
      </div>

      {/* Promotions List */}
      <div className="space-y-3">
        {mockPromotions.map((promo) => (
          <div key={promo.id} className="promo-card cursor-pointer hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {promo.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {promo.business}
                </p>
                <p className="text-xs text-primary mt-1">
                  до {promo.validUntil}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <button className="w-full text-center text-sm text-primary hover:underline py-2">
        Все акции →
      </button>

      {/* Placeholder Banner */}
      <div className="mt-6 p-4 rounded-lg border border-dashed border-border bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">
          Рекламный блок
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (placeholder)
        </p>
      </div>
    </div>
  );
};
