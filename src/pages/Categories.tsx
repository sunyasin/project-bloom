import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Milk, Apple, Wheat, Droplets, Egg, Cookie, Salad, Package, Filter } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock API для получения списка городов (GET /api/cities)
const mockAPIGetCities = async () => {
  console.log("[mockAPI] GET /api/cities");
  return ["Все города", "Коломна", "Тула", "Рязань", "Москва", "Калуга"];
};

// Mock categories data with cities
const mockCategories = [
  { id: "1", name: "Молочные продукты", icon: Milk, count: 24, cities: ["Коломна", "Тула", "Рязань"] },
  { id: "2", name: "Фрукты и ягоды", icon: Apple, count: 18, cities: ["Москва", "Калуга"] },
  { id: "3", name: "Зерновые и крупы", icon: Wheat, count: 12, cities: ["Тула", "Рязань"] },
  { id: "4", name: "Мёд и продукты пчеловодства", icon: Droplets, count: 15, cities: ["Коломна", "Рязань"] },
  { id: "5", name: "Яйца и птица", icon: Egg, count: 9, cities: ["Москва", "Коломна"] },
  { id: "6", name: "Хлебобулочные изделия", icon: Cookie, count: 21, cities: ["Тула", "Калуга"] },
  { id: "7", name: "Овощи и зелень", icon: Salad, count: 32, cities: ["Коломна", "Москва", "Рязань"] },
  { id: "8", name: "Другие товары", icon: Package, count: 25, cities: ["Тула", "Калуга", "Рязань"] },
];

const Categories = () => {
  const [cityFilter, setCityFilter] = useState("Все города");
  const cities = ["Все города", "Коломна", "Тула", "Рязань", "Москва", "Калуга"]; // В реальном приложении - из mockAPIGetCities

  const filteredCategories = cityFilter === "Все города"
    ? mockCategories
    : mockCategories.filter(cat => cat.cities.includes(cityFilter));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Категории</h1>
            <p className="text-muted-foreground mt-1">
              Найдите производителей по категориям товаров
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

        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.id}
                  to={`/category/${category.id}${cityFilter !== "Все города" ? `?city=${encodeURIComponent(cityFilter)}` : ""}`}
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
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              В выбранном городе нет категорий с производителями
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
