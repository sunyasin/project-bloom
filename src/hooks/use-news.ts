import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NewsItem {
  id: string;
  owner_id: string;
  producer_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  is_event: boolean;
  event_date: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsFormData {
  title: string;
  content: string;
  is_event: boolean;
  event_date: string;
}

export function useNews(userId: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNews = useCallback(async () => {
    if (!userId) {
      setNews([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNews((data as NewsItem[]) || []);
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить новости",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const createNews = async (formData: NewsFormData) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("news")
        .insert({
          owner_id: userId,
          producer_id: userId, // Новость производителя - привязываем к producer_id
          title: formData.title,
          content: formData.content || null,
          is_event: formData.is_event,
          event_date: formData.event_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      setNews((prev) => [data as NewsItem, ...prev]);
      toast({
        title: "Успешно",
        description: "Новость создана",
      });
      return data;
    } catch (error: any) {
      console.error("Error creating news:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать новость",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNews = async (id: string, formData: NewsFormData) => {
    try {
      const { data, error } = await supabase
        .from("news")
        .update({
          title: formData.title,
          content: formData.content || null,
          is_event: formData.is_event,
          event_date: formData.event_date || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setNews((prev) =>
        prev.map((n) => (n.id === id ? (data as NewsItem) : n))
      );
      toast({
        title: "Успешно",
        description: "Новость обновлена",
      });
      return data;
    } catch (error: any) {
      console.error("Error updating news:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить новость",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase
        .from("news")
        .update({ is_published: false })
        .eq("id", id);

      if (error) throw error;

      setNews((prev) => prev.filter((n) => n.id !== id));
      toast({
        title: "Успешно",
        description: "Новость удалена",
      });
      return true;
    } catch (error: any) {
      console.error("Error deleting news:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить новость",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    news,
    loading,
    createNews,
    updateNews,
    deleteNews,
    refetch: fetchNews,
  };
}
