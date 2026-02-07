import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useNavigate } from "react-router-dom";
import { Milk, Apple, Wheat, Droplets, Egg, Cookie, Salad, Package, Filter, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types/db";

const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop";

interface CategoryWithCount extends Category {
  count: number;
}

const Categories = () => {
  const navigate = useNavigate();
  const [cityFilter, setCityFilter] = useState("Все города");
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [cities, setCities] = useState<string[]>(["Все города"]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [barterOnly, setBarterOnly] = useState(false);

  const canSearch = searchQuery.length >= 3;

  const handleSearch = () => {
    if (!canSearch) return;
    const params = new URLSearchParams();
    params.set("q", searchQuery);
    if (barterOnly) params.set("barter", "true");
    navigate(`/products/search?${params.toString()}`);
  };

  // Загрузка списка городов (один раз)
  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("city")
        .eq("status", "published")
        .not("city", "is", null)
        .neq("city", "");
      
      if (error) {
        console.error("[Supabase] Error fetching cities:", error);
        return;
      }
      
      const uniqueCities = new Set<string>();
      data?.forEach(b => {
        if (b.city) uniqueCities.add(b.city);
      });
      
      setCities(["Все города", ...Array.from(uniqueCities).sort()]);
    };
    
    fetchCities();
  }, []);

  // Загрузка категорий с фильтрацией по городу
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      
      // Загружаем все категории
      const { data: allCategories, error: err } = await supabase
        .from("categories")
        .select("*")
        .eq("is_hidden", false)
        .order("position");

      if (err) {
        console.error("[Supabase] Error fetching categories:", err);
        setLoading(false);
        return;
      }

      // Загружаем визитки с фильтром по городу
      let businessQuery = supabase
        .from("businesses")
        .select("category_id, owner_id, city")
        .eq("status", "published")
        .not("category_id", "is", null);
      
      if (cityFilter && cityFilter !== "Все города") {
        businessQuery = businessQuery.eq("city", cityFilter);
      }
      
      const { data: businesses, error: err2 } = await businessQuery;
      
      if (err2) {
        console.error("[Supabase] Error fetching businesses:", err2);
        setLoading(false);
        return;
      }

      // Подсчитываем уникальных производителей для каждой категории
      const producersByCategory = new Map<string, Set<string>>();

      businesses?.forEach((b) => {
        if (!b.category_id || !b.owner_id) return;
        if (!producersByCategory.has(b.category_id)) {
          producersByCategory.set(b.category_id, new Set());
        }
        producersByCategory.get(b.category_id)!.add(b.owner_id);
      });

      // Фильтруем категории — оставляем только те, где есть производители
      const categoriesWithContent = (allCategories as (Category & { count?: number })[])
        .filter((cat) => producersByCategory.has(cat.id) && producersByCategory.get(cat.id)!.size > 0)
        .map((cat) => ({
          ...cat,
          count: producersByCategory.get(cat.id)?.size || 0,
        }));

      setCategories(categoriesWithContent as CategoryWithCount[]);
      setLoading(false);
    };

    fetchCategories();
  }, [cityFilter]);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Search Section */}
        <div className="content-card space-y-4">
          <h2 className="font-medium text-foreground">Поиск товаров</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Введите название товара (мин. 3 буквы)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSearch && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={!canSearch}>
                <Search className="h-4 w-4 mr-2" />
                Искать
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="barter-only"
                checked={barterOnly}
                onCheckedChange={(checked) => setBarterOnly(checked as boolean)}
              />
              <Label htmlFor="barter-only" className="cursor-pointer whitespace-nowrap">
                Только бартер
              </Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Категории товаров и услуг</h1>
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
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              return (
                <Link
                  key={category.id}
                  to={`/category/${category.id}${cityFilter !== "Все города" ? `?city=${encodeURIComponent(cityFilter)}` : ""}`}
                  className="content-card hover:border-primary/30 transition-colors group"
                >
                  <div className="aspect-square overflow-hidden rounded-t-lg">
                    <img
                      src={category.image_url || DEFAULT_CATEGORY_IMAGE}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-center">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {category.count} {category.count === 1 ? "визитка" : category.count >= 2 && category.count <= 4 ? "визитки" : "визиток"}
                    </p>
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
