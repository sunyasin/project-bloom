import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Milk, Apple, Wheat, Droplets, Egg, Cookie, Salad, Package, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Маппинг имён иконок на компоненты
const iconMap: Record<string, React.ElementType> = {
  Milk,
  Apple,
  Wheat,
  Droplets,
  Egg,
  Cookie,
  Salad,
  Package,
};

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  cities: string[] | null;
}

const Categories = () => {
  const [cityFilter, setCityFilter] = useState("Все города");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const cities = ["Все города", "Коломна", "Тула", "Рязань", "Москва", "Калуга"];

  // GET /api/categories - загрузка категорий из БД
  useEffect(() => {
    const fetchCategories = async () => {
      console.log("[Supabase] GET categories where is_hidden=false, order by position");
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, count, cities")
        .eq("is_hidden", false)
        .order("position");

      if (error) {
        console.error("[Supabase] Error fetching categories:", error);
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  const filteredCategories = cityFilter === "Все города"
    ? categories
    : categories.filter(cat => cat.cities?.includes(cityFilter));

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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredCategories.map((category) => {
              const Icon = iconMap[category.icon] || Package;
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
