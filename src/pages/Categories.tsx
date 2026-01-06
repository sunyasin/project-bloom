import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Milk, Apple, Wheat, Droplets, Egg, Cookie, Salad, Package, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/types/db";

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

interface CategoryWithCount extends Category {
  count: number;
}

const Categories = () => {
  const [cityFilter, setCityFilter] = useState("Все города");
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  //const cities = ["Все города", "Коломна", "Тула", "Рязань", "Москва", "Калуга"];

  // GET /api/categories - загрузка категорий из БД
  useEffect(() => {
    const fetchCategories = async () => {
      console.log("[Supabase] GET categories where is_hidden=false, order by position");
      const { data: allCategories, error: err } = await supabase
        .from("categories")
        .select("*")
        .eq("is_hidden", false)
        .order("position");

      if (err) {
        console.error("[Supabase] Error fetching categories:", err);
        throw err;
      } else {
        //Загрузить товары с category_id и producer_id

        const { data: products, error: err1 } = await supabase
          .from("products")
          .select("category_id, producer_id")
          .eq("is_available", true)
          .not("category_id", "is", null);

        if (err1) throw err1;

        //Шаг 3: Загрузить визитки с category_id и owner_id

        const { data: businesses, error: err2 } = await supabase
          .from("businesses")
          .select("category_id, owner_id, city")
          .eq("status", "published")
          .not("category_id", "is", null);
        if (err2) throw err2;

        //Шаг 4: Подсчитать уникальных производителей для каждой категории
        // Для каждой категории собираем уникальных producer_id из товаров и owner_id из визиток
        const producersByCategory = new Map<string, Set<string>>();

        products?.forEach((p) => {
          if (!producersByCategory.has(p.category_id)) {
            producersByCategory.set(p.category_id, new Set());
          }
          producersByCategory.get(p.category_id)!.add(p.producer_id);
        });

        businesses?.forEach((b) => {
          if (!producersByCategory.has(b.category_id)) {
            producersByCategory.set(b.category_id, new Set());
          }
          producersByCategory.get(b.category_id)!.add(b.owner_id);
        });

        //Шаг 5: Фильтровать категории и добавить реальный count
        const categoriesWithContent = allCategories
          .filter((cat) => producersByCategory.has(cat.id))
          .map((cat) => ({
            ...cat,
            count: producersByCategory.get(cat.id)?.size || 0,
          }));

        setCategories(categoriesWithContent || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  /*
// При фильтрации по городу пересчитываем производителей
const filteredProducersByCategory = new Map<string, Set<string>>();

// Добавляем производителей товаров (без фильтра по городу)
products?.forEach(p => {...});

// Добавляем только визитки из выбранного города
businesses
  ?.filter(b => cityFilter === "Все города" || b.city === cityFilter)
  .forEach(b => {...});
Изменения в состоянии компонента
Добавить расширенный тип для категорий с динамическим count:


interface CategoryWithCount extends Category {
  count: number; // переопределяем как динамическое значение
}

const [categories, setCategories] = useState<CategoryWithCount[]>([]);  
  
 
  */
  //Динамический список городов
  //Извлекать уникальные города из загруженных визиток вместо захардкоженного списка:
  const uniqueCities = [...new Set(businesses?.map((b) => b.city).filter(Boolean))];
  const cities = ["Все города", ...uniqueCities.sort()];

  const filteredCategories =
    cityFilter === "Все города" ? categories : categories.filter((cat) => cat.cities?.includes(cityFilter));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Категории</h1>
            <p className="text-muted-foreground mt-1">Найдите производителей по категориям товаров</p>
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
                      <p className="text-sm text-muted-foreground">{category.count} производителей</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">В выбранном городе нет категорий с производителями</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
