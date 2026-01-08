import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  producer_id: string;
  name: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  content: string;
}

export interface ProductInsert {
  name: string;
  description?: string | null;
  price?: number | null;
  unit?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  is_available?: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price?: number | null;
  unit?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  is_available?: boolean;
}

// Image validation helper
const validateImage = (file: File): { valid: boolean; error: string | null } => {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: "Допустимые форматы: JPEG, PNG, WebP, GIF" };
  }
  if (file.size > maxSize) {
    return { valid: false, error: "Максимальный размер файла: 5MB" };
  }
  return { valid: true, error: null };
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("producer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товар",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const createProduct = useCallback(async (data: ProductInsert): Promise<Product | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return null;
      }

      const { data: newProduct, error } = await supabase
        .from("products")
        .insert({
          ...data,
          producer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const product = newProduct as Product;
      setProducts((prev) => [product, ...prev]);
      toast({
        title: "Успешно",
        description: "Товар создан",
      });
      return product;
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать товар",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateProduct = useCallback(async (id: string, data: ProductUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("products")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      toast({
        title: "Успешно",
        description: "Товар обновлён",
      });
      return true;
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить товар",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Soft delete via is_available = false
      const { error } = await supabase
        .from("products")
        .update({ is_available: false })
        .eq("id", id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Успешно",
        description: "Товар удалён",
      });
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить товар",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Upload product image to Supabase Storage
  const uploadProductImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return null;
      }

      // Validate image
      const validation = validateImage(file);
      if (!validation.valid) {
        toast({
          title: "Ошибка",
          description: validation.error || "Недопустимый файл",
          variant: "destructive",
        });
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Delete product image from storage
  const deleteProductImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/storage/v1/object/public/product-images/");
      if (pathParts.length < 2) return true; // Not a storage URL

      const filePath = pathParts[1];
      
      const { error } = await supabase.storage
        .from("product-images")
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    deleteProductImage,
  };
}
