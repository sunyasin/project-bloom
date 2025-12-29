import { MainLayout } from "@/components/layout/MainLayout";
import { Tag, Building2 } from "lucide-react";

// Mock promotions data
const mockPromotions = [
  {
    id: "1",
    title: "Скидка 20% на весь мёд",
    description: "При покупке от 1 кг любого мёда",
    business: "Пасека Иванова",
    businessId: "1",
    validUntil: "31 января 2026",
    discount: "-20%",
  },
  {
    id: "2",
    title: "Акция 2+1 на сыры",
    description: "Купи два сыра — третий в подарок",
    business: "Ферма Петровых",
    businessId: "2",
    validUntil: "15 февраля 2026",
    discount: "2+1",
  },
  {
    id: "3",
    title: "Бесплатная доставка",
    description: "При заказе от 3000 рублей",
    business: "Эко-овощи",
    businessId: "3",
    validUntil: "28 января 2026",
    discount: "FREE",
  },
  {
    id: "4",
    title: "Скидка на новинки",
    description: "15% на новые сорта хлеба",
    business: "Хлебный дом",
    businessId: "4",
    validUntil: "10 января 2026",
    discount: "-15%",
  },
];

const Promotions = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Акции</h1>
          <p className="text-muted-foreground mt-1">
            Специальные предложения от производителей
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockPromotions.map((promo) => (
            <article key={promo.id} className="content-card hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">
                    {promo.discount}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{promo.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {promo.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-primary">{promo.business}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Действует до {promo.validUntil}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Promotions;
