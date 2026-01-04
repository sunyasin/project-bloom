import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Promotion {
  id: string;
  owner_id: string;
  business_id: string | null;
  title: string;
  description: string | null;
  discount: string;
  image_url: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionFormData {
  title: string;
  description: string;
  discount: string;
  image_url: string;
  valid_until: string;
  business_id: string;
}

export function usePromotions(userId: string | null) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPromotions = useCallback(async () => {
    if (!userId) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromotions((data as Promotion[]) || []);
    } catch (error: any) {
      console.error("Error fetching promotions:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить акции",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const createPromotion = async (formData: PromotionFormData) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("promotions")
        .insert({
          owner_id: userId,
          title: formData.title,
          description: formData.description || null,
          discount: formData.discount,
          image_url: formData.image_url || null,
          valid_until: formData.valid_until || null,
          business_id: formData.business_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPromotions((prev) => [data as Promotion, ...prev]);
      toast({
        title: "Успешно",
        description: "Акция создана",
      });
      return data;
    } catch (error: any) {
      console.error("Error creating promotion:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать акцию",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePromotion = async (id: string, formData: PromotionFormData) => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .update({
          title: formData.title,
          description: formData.description || null,
          discount: formData.discount,
          image_url: formData.image_url || null,
          valid_until: formData.valid_until || null,
          business_id: formData.business_id || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? (data as Promotion) : p))
      );
      toast({
        title: "Успешно",
        description: "Акция обновлена",
      });
      return data;
    } catch (error: any) {
      console.error("Error updating promotion:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить акцию",
        variant: "destructive",
      });
      return null;
    }
  };

  const deletePromotion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setPromotions((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Успешно",
        description: "Акция удалена",
      });
      return true;
    } catch (error: any) {
      console.error("Error deleting promotion:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить акцию",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    promotions,
    loading,
    createPromotion,
    updatePromotion,
    deletePromotion,
    refetch: fetchPromotions,
  };
}
