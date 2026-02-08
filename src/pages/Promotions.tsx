import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tag, Loader2, Filter, X, ExternalLink, Grid, Image, List } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount: string;
  image_url: string | null;
  valid_until: string | null;
  owner_id: string;
  business_id: string;
  donation: number;
}

interface Business {
  id: string;
  name: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

type ViewMode = "full" | "image" | "text";

const Promotions = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredPromo, setHoveredPromo] = useState<Promotion | null>(null);
  const [touchTimeout, setTouchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("full");

  // Fetch promotions, businesses and categories
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

        // Get unique business IDs from promotions
        const businessIds = [...new Set((promoData || []).map((p: Promotion) => p.business_id))];

        // Fetch businesses for these promotions
        let businessData: Business[] = [];
        if (businessIds.length > 0) {
          const { data: bizData, error: bizError } = await supabase
            .from("businesses")
            .select("id, name, category_id")
            .in("id", businessIds);

          if (bizError) throw bizError;
          businessData = bizData || [];
        }

        // Get unique category IDs from businesses
        const categoryIds = [...new Set(businessData.filter(b => b.category_id).map(b => b.category_id as string))];

        // Fetch categories for filter
        let catData: Category[] = [];
        if (categoryIds.length > 0) {
          const { data: categoriesResult, error: catError } = await supabase
            .from("categories")
            .select("id, name")
            .in("id", categoryIds)
            .order("position", { ascending: true });

          if (catError) throw catError;
          catData = categoriesResult || [];
        }

        setPromotions(promoData || []);
        setBusinesses(businessData);
        setCategories(catData);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create business lookup map
  const businessMap = useMemo(() => {
    const map: Record<string, Business> = {};
    businesses.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }, [businesses]);

  // Filter promotions by category of their linked business
  const filteredPromotions = useMemo(() => {
    if (selectedCategory === "all") return promotions;

    return promotions.filter((promo) => {
      const business = businessMap[promo.business_id];
      return business?.category_id === selectedCategory;
    });
  }, [promotions, selectedCategory, businessMap]);

  // Handle mouse enter - show popup after delay
  const handleMouseEnter = (promo: Promotion) => {
    const timer = setTimeout(() => {
      setHoveredPromo(promo);
    }, 300);
    setTouchTimeout(timer);
  };

  // Handle mouse leave - cancel popup
  const handleMouseLeave = () => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
    setHoveredPromo(null);
  };

  // Handle touch start - show popup
  const handleTouchStart = (promo: Promotion) => {
    setHoveredPromo(promo);
  };

  // Handle click on promotion - navigate to business page
  const handlePromoClick = (promo: Promotion) => {
    navigate(`/business/${promo.business_id}`);
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

  // Get category name from business
  const getCategoryName = (businessId: string): string => {
    const business = businessMap[businessId];
    if (!business?.category_id) return "";
    const cat = categories.find((c) => c.id === business.category_id);
    return cat?.name || "";
  };

  // Get business name
  const getBusinessName = (businessId: string): string => {
    return businessMap[businessId]?.name || "";
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Объявления</h1>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "full" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("full")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "image" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("image")}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "text" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("text")}
            >
              <List className="h-4 w-4" />
            </Button>
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Объявлений пока нет</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Объявлений в выбранной категории нет
            </p>
          </div>
        ) : (
          <>
            {/* Full view */}
            {viewMode === "full" && (
              <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                {filteredPromotions.map((promo) => (
                  <article
                    key={promo.id}
                    className="content-card hover:border-primary/30 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => handlePromoClick(promo)}
                    onMouseEnter={() => handleMouseEnter(promo)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={() => handleTouchStart(promo)}
                  >
                    <div className="flex h-32">
                      {/* Left half - Image */}
                      <div className="w-1/2 relative">
                        {promo.image_url ? (
                          <img
                            src={promo.image_url}
                            alt={promo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Tag className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                          {promo.discount}
                        </span>
                      </div>
                      {/* Right half - Description */}
                      <div className="w-1/2 p-3 flex flex-col justify-start overflow-hidden">
                        <h3 className="font-medium text-foreground text-sm line-clamp-2">{promo.title}</h3>
                        {promo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                            {promo.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Image only view */}
            {viewMode === "image" && (
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {filteredPromotions.map((promo) => (
                  <article
                    key={promo.id}
                    className="content-card hover:border-primary/30 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => handlePromoClick(promo)}
                    onMouseEnter={() => handleMouseEnter(promo)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={() => handleTouchStart(promo)}
                  >
                    <div className="relative">
                      {promo.image_url ? (
                        <img
                          src={promo.image_url}
                          alt={promo.title}
                          className="w-full h-32 object-contain bg-muted"
                        />
                      ) : (
                        <div className="w-full h-32 bg-primary/10 flex items-center justify-center">
                          <Tag className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                        {promo.discount}
                      </span>
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-foreground truncate">{promo.title}</h3>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Text only view */}
            {viewMode === "text" && (
              <div className="space-y-4">
                {filteredPromotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="cursor-pointer"
                    onClick={() => handlePromoClick(promo)}
                    onMouseEnter={() => handleMouseEnter(promo)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={() => handleTouchStart(promo)}
                  >
                    <h3 className="font-medium text-foreground">{promo.title}</h3>
                    {promo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {promo.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Popup dialog */}
            <Dialog open={!!hoveredPromo} onOpenChange={() => setHoveredPromo(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{hoveredPromo?.title}</DialogTitle>
                </DialogHeader>
                {hoveredPromo && (
                  <div className="space-y-4">
                    {hoveredPromo.image_url && (
                      <img
                        src={hoveredPromo.image_url}
                        alt={hoveredPromo.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {hoveredPromo.description}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        {getBusinessName(hoveredPromo.business_id)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/business/${hoveredPromo.business_id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Визитка
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Promotions;