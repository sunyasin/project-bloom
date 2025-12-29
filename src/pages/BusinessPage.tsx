import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Phone, Mail, Globe, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    products: ["Липовый мёд", "Гречишный мёд", "Цветочный мёд", "Прополис", "Перга"],
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
    products: ["Молоко", "Творог", "Сыры", "Сметана", "Кефир"],
    promotions: [
      { id: "2", title: "Акция 2+1 на сыры", validUntil: "15 февраля" },
    ],
  },
};

const BusinessPage = () => {
  const { id } = useParams<{ id: string }>();
  const business = mockBusinessData[id || "1"];

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

        {/* Products */}
        <div className="content-card">
          <h2 className="section-title">Продукция</h2>
          <div className="flex flex-wrap gap-2">
            {business.products.map((product: string) => (
              <span
                key={product}
                className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm"
              >
                {product}
              </span>
            ))}
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
    </MainLayout>
  );
};

export default BusinessPage;
