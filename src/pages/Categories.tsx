import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Milk, Apple, Wheat, Droplets, Egg, Cookie, Salad, Package } from "lucide-react";

// Mock categories data
const mockCategories = [
  { id: "1", name: "Молочные продукты", icon: Milk, count: 24 },
  { id: "2", name: "Фрукты и ягоды", icon: Apple, count: 18 },
  { id: "3", name: "Зерновые и крупы", icon: Wheat, count: 12 },
  { id: "4", name: "Мёд и продукты пчеловодства", icon: Droplets, count: 15 },
  { id: "5", name: "Яйца и птица", icon: Egg, count: 9 },
  { id: "6", name: "Хлебобулочные изделия", icon: Cookie, count: 21 },
  { id: "7", name: "Овощи и зелень", icon: Salad, count: 32 },
  { id: "8", name: "Другие товары", icon: Package, count: 25 },
];

const Categories = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Категории</h1>
          <p className="text-muted-foreground mt-1">
            Найдите производителей по категориям товаров
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {mockCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="content-card hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.count} производителей
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Categories;
