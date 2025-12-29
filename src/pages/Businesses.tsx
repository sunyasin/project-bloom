import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

// Mock businesses data
const mockBusinesses = [
  { id: "1", name: "Пасека Иванова", category: "Мёд и продукты пчеловодства", location: "Рязанская область" },
  { id: "2", name: "Ферма Петровых", category: "Молочные продукты", location: "Московская область" },
  { id: "3", name: "Эко-овощи", category: "Овощи и зелень", location: "Калужская область" },
  { id: "4", name: "Хлебный дом", category: "Хлебобулочные изделия", location: "Тульская область" },
  { id: "5", name: "Молочный край", category: "Молочные продукты", location: "Тульская область" },
  { id: "6", name: "Сады Придонья", category: "Фрукты и ягоды", location: "Воронежская область" },
];

const Businesses = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Все производители</h1>
          <p className="text-muted-foreground mt-1">
            Каталог местных производителей
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockBusinesses.map((business) => (
            <Link
              key={business.id}
              to={`/business/${business.id}`}
              className="content-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{business.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{business.category}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {business.location}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Businesses;
