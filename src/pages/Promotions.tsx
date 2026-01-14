import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tag, Loader2, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount: string;
  image_url: string | null;
  valid_until: string | null;
  owner_id: string;
  category_id: string | null;
  donation: number;
}

interface Category {
  id: string;
  name: string;
}

const Promotions = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch promotions and categories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active promotions sorted by donation descending
        const { data: promoData, error: promoError } = await supabase
          .from("promotions")
          .select("*")
          .eq("is_active", true)
          .order("donation", { ascending: false });

        if (promoError) throw promoError;

        // Fetch categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("is_hidden", false)
          .order("position", { ascending: true });

        if (catError) throw catError;

        setPromotions(promoData || []);
        setCategories(catData || []);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter promotions by category from promotion's category_id
  const filteredPromotions = useMemo(() => {
    if (selectedCategory === "all") return promotions;

    return promotions.filter((promo) => promo.category_id === selectedCategory);
  }, [promotions, selectedCategory]);

  // Handle click on promotion - navigate to producer profile
  const handlePromoClick = (promo: Promotion) => {
    navigate(`/producer/${promo.owner_id}`);
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Бессрочно";
    try {
      return format(new Date(dateStr), "d MMMM yyyy", { locale: ru });
    } catch {
      return dateStr;
    }
  };

  // Get category name
  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "";
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || "";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Акции</h1>
            <p className="text-muted-foreground mt-1">
              Специальные предложения от производителей
            </p>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory !== "all" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCategory("all")}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        {!loading && promotions.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Найдено: {filteredPromotions.length} из {promotions.length}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Акций пока нет</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Акций в выбранной категории нет
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPromotions.map((promo) => (
              <article
                key={promo.id}
                className="content-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => handlePromoClick(promo)}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {promo.image_url ? (
                      <img
                        src={promo.image_url}
                        alt={promo.title}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Tag className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">
                      {promo.discount}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{promo.title}</h3>
                    {promo.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {promo.description}
                      </p>
                    )}
                    {promo.category_id && (
                      <p className="text-xs text-primary mt-1">
                        {getCategoryName(promo.category_id)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Действует до {formatDate(promo.valid_until)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Promotions;