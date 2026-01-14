import { Tag, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";

interface PromotionDisplay {
  id: string;
  title: string;
  businessId: string;
  validUntil: string | null;
}

export const RightSidebar = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<PromotionDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select(`
          id,
          title,
          valid_until,
          business_id
        `)
        .eq("is_active", true)
        .order("donation", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching promotions:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const mapped: PromotionDisplay[] = data.map(p => ({
          id: p.id,
          title: p.title,
          businessId: p.business_id,
          validUntil: p.valid_until 
            ? format(new Date(p.valid_until), "d MMMM", { locale: ru })
            : null,
        }));

        setPromotions(mapped);
      }
      setLoading(false);
    };

    fetchPromotions();
  }, []);

  const handlePromoClick = (promo: PromotionDisplay) => {
    navigate(`/business/${promo.businessId}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Promotions Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Актуальные акции</h3>
      </div>

      {/* Promotions List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Загрузка...</p>
        ) : promotions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет активных акций</p>
        ) : (
          promotions.map((promo) => (
            <div 
              key={promo.id} 
              className="promo-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handlePromoClick(promo)}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {promo.title}
                  </p>
                  {promo.validUntil && (
                    <p className="text-xs text-primary mt-1">
                      до {promo.validUntil}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All Link */}
      <Link to="/promotions" className="w-full block text-center text-sm text-primary hover:underline py-2">
        Все акции →
      </Link>

      {/* Placeholder Banner */}
      <div className="mt-6 p-4 rounded-lg border border-dashed border-border bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">
          Рекламный блок
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (placeholder)
        </p>
      </div>
    </div>
  );
};