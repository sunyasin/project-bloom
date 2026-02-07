import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { cn } from "@/lib/utils";
import {
  Save,
  ArrowLeft,
  Eye,
  Upload,
  X,
  Inbox,
  Check,
  ChevronsUpDown,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface BusinessCard {
  id: string;
  name: string;
}

type ProductSaleType = 'sell_only' | 'barter_goods' | 'barter_coin';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  galleryUrls: string[];
  content: string;
  categoryId: string;
  businessCardId: string; // Если пустая строка - товар для всех визиток
  saleType: ProductSaleType;
  coinPrice: number | null;
}

// Валидация файла изображения (для будущего Storage)
const validateProductImage = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Неподдерживаемый формат. Используйте JPG, PNG, WebP или GIF" };
  }
  if (file.size > maxSize) {
    return { valid: false, error: "Файл слишком большой. Максимум 5MB" };
  }
  return { valid: true };
};

// Проверка URL на blob (нельзя сохранять в БД)
const isBlobUrl = (url: string): boolean => {
  return url.startsWith('blob:');
};

// Данные для предпросмотра
const mockAPIProductPreviewData = {
  producerName: "Фермерское хозяйство «Заря»",
  phone: "+7 (999) 123-45-67",
};


const ProductEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getProduct, createProduct, updateProduct } = useProducts();
  const isNew = id === "new";

  const [productData, setProductData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    unit: "шт",
    image: "",
    galleryUrls: [],
    content: "",
    categoryId: "",
    businessCardId: "", // Пустая строка = товар для всех визиток
    saleType: "sell_only",
    coinPrice: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(!isNew);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(isNew ? null : id || null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [businessCardOpen, setBusinessCardOpen] = useState(false);

  // Загрузка категорий из БД
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from("categories").select("id, name").eq("is_hidden", false).order("position");

      if (data) {
        setCategories(data);
      }
    };
    loadCategories();
  }, []);

  // Загрузка бизнес-карт пользователя
  const loadBusinessCards = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .in("status", ["published", "draft"])
      .order("name");

    if (data) {
      setBusinessCards(data);
    }
  }, []);

  useEffect(() => {
    loadBusinessCards();
  }, [loadBusinessCards]);

  // Перезагружать бизнес-карты при открытии выпадающего списка
  const handleBusinessCardOpenChange = async (open: boolean) => {
    setBusinessCardOpen(open);
    if (open) {
      await loadBusinessCards();
    }
  };

  const quillRef = useRef<ReactQuill>(null);
  const [isEditorDragging, setIsEditorDragging] = useState(false);

  // Quill modules config
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote"],
      ["link", "image"],
      ["clean"],
    ],
  }), []);

  const quillFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "align",
    "list",
    "blockquote",
    "link",
    "image",
  ];

  const handleContentChange = (value: string) => {
    setProductData((prev) => ({ ...prev, content: value }));
  };

  // Upload image for editor drag-and-drop
  const uploadEditorImage = async (file: File): Promise<string | null> => {
    const validation = validateProductImage(file);
    if (!validation.valid) {
      toast({
        title: "Ошибка",
        description: validation.error,
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/editor-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Editor image upload error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle drag-and-drop for Quill editor
  const handleEditorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditorDragging(true);
  };

  const handleEditorDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditorDragging(false);
  };

  const handleEditorDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditorDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const url = await uploadEditorImage(file);
      if (url && quillRef.current) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, "image", url);
        quill.setSelection(range.index + 1);
        toast({
          title: "Загружено",
          description: "Изображение добавлено в редактор",
        });
      }
    } else if (file) {
      toast({
        title: "Ошибка",
        description: "Перетащите файл изображения",
        variant: "destructive",
      });
    }
  };

  // Загрузка данных товара при редактировании
  useEffect(() => {
    const loadProductData = async () => {
      if (id && id !== "new") {
        setIsDataLoading(true);
        try {
          const data = await getProduct(id);
          if (data) {
            let imageUrl = data.image_url || "";
            // Проверка на blob URL - очищаем если найден
            if (isBlobUrl(imageUrl)) {
              imageUrl = "";
            }
            setProductData({
              name: data.name,
              description: data.description || "",
              price: data.price || 0,
              unit: data.unit || "шт",
              image: imageUrl,
              galleryUrls: (data as any).gallery_urls || [],
              content: data.content || "",
              categoryId: data.category_id || "",
              businessCardId: data.business_card_id || "",
              saleType: (data as any).sale_type || "sell_only",
              coinPrice: (data as any).coin_price || null,
            });
            setProductId(data.id);
          } else {
            toast({
              title: "Ошибка",
              description: "Товар не найден",
              variant: "destructive",
            });
            navigate("/dashboard");
          }
        } catch (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить данные товара",
            variant: "destructive",
          });
        } finally {
          setIsDataLoading(false);
        }
      } else {
        setIsDataLoading(false);
      }
    };

    loadProductData();
  }, [id, navigate, toast, getProduct]);

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setProductData((prev) => ({ ...prev, [field]: value }));
  };

  // Фоновый вызов уведомлений (с обработкой ошибок)
 const triggerNotifications = async () => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const API_SECRET_KEY = import.meta.env.SUPAPI_SECRET_KEY || "no_api_key_found";
      await fetch(`${SUPABASE_URL}/functions/v1/process-notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
          "x-api-key": API_SECRET_KEY,
        },
      });
    } catch (e) {
      console.log("[Notifications] Отложены - будут обработаны при следующем запуске");
    }
  };

  const handleSave = async () => {
    if (!productData.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите название товара",
        variant: "destructive",
      });
      return;
    }

    // Проверка на blob URL перед сохранением
    if (isBlobUrl(productData.image)) {
      toast({
        title: "Ошибка изображения",
        description: "Изображение не загружено корректно. Пожалуйста, загрузите изображение заново.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const saveData = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        unit: productData.unit,
        image_url: productData.image,
        gallery_urls: productData.galleryUrls,
        category_id: productData.categoryId || null,
        content: productData.content,
        sale_type: productData.saleType,
        coin_price: productData.saleType === "barter_coin" ? productData.coinPrice : null,
        // business_card_id: null если товар для всех визиток, иначе ID визитки
        business_card_id: productData.businessCardId || null,
      };

      if (isNew || !productId) {
        const newProduct = await createProduct(saveData);
        if (newProduct) {
          setProductId(newProduct.id);
          // Запускаем фоновую обработку уведомлений
          triggerNotifications();
          navigate(`/dashboard/product/${newProduct.id}`, { replace: true });
        }
      } else {
        await updateProduct(productId, saveData);
        // Запускаем фоновую обработку уведомлений
        triggerNotifications();
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить товар",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract file path from Supabase Storage URL
  const extractStoragePath = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/\/product-images\/(.+)$/);
    return match ? match[1] : null;
  };

  // Delete image from Storage
  const deleteImageFromStorage = async (imageUrl: string) => {
    const filePath = extractStoragePath(imageUrl);
    if (filePath) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove([filePath]);
      if (error) {
        console.error("Error deleting old image:", error);
      }
    }
  };

  const uploadImage = async (file: File) => {
    const validation = validateProductImage(file);
    if (!validation.valid) {
      toast({
        title: "Ошибка",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      // Delete old image if exists
      if (productData.image) {
        await deleteImageFromStorage(productData.image);
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      updateField("image", publicUrl);
      toast({
        title: "Загружено",
        description: "Изображение успешно загружено",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  const handleDeleteImage = async () => {
    if (productData.image) {
      // Delete from Storage
      await deleteImageFromStorage(productData.image);
      
      updateField("image", "");
      toast({
        title: "Удалено",
        description: "Изображение удалено",
      });
    }
  };

  // Gallery upload function
  const uploadGalleryImage = async (file: File) => {
    const validation = validateProductImage(file);
    if (!validation.valid) {
      toast({
        title: "Ошибка",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/gallery-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setProductData(prev => {
        const newGallery = [...prev.galleryUrls, publicUrl];
        // If main image is empty, use first gallery image
        const newImage = !prev.image && newGallery.length > 0 ? newGallery[0] : prev.image;
        return {
          ...prev,
          image: newImage,
          galleryUrls: newGallery
        };
      });

      toast({
        title: "Загружено",
        description: "Изображение добавлено в галерею",
      });
    } catch (error) {
      console.error("Gallery upload error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        await uploadGalleryImage(file);
      }
    }
  };

  const handleDeleteGalleryImage = async (index: number) => {
    const imageUrl = productData.galleryUrls[index];
    await deleteImageFromStorage(imageUrl);
    
    setProductData(prev => ({
      ...prev,
      galleryUrls: prev.galleryUrls.filter((_, i) => i !== index)
    }));
    
    toast({
      title: "Удалено",
      description: "Изображение удалено из галереи",
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      await uploadImage(file);
    } else {
      toast({
        title: "Ошибка",
        description: "Перетащите файл изображения",
        variant: "destructive",
      });
    }
  };

  if (isDataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{isNew ? "Создание товара" : "Редактирование товара"}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Предпросмотр
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>

        {/* Основные данные */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Основные данные</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Название товара</label>
              <Input
                value={productData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Название товара"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Цена</label>
                <Input
                  type="number"
                  value={productData.price}
                  onChange={(e) => updateField("price", Number(e.target.value))}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Единица</label>
                <Input
                  value={productData.unit}
                  onChange={(e) => updateField("unit", e.target.value)}
                  placeholder="шт, кг, л"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Краткое описание</label>
            <Textarea
              value={productData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Краткое описание товара"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Категория</label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between"
                >
                  {productData.categoryId
                    ? categories.find((c) => c.id === productData.categoryId)?.name
                    : "Выберите категорию..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Поиск категории..." 
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>Категория не найдена</CommandEmpty>
                    <CommandGroup>
                      {categories.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={category.name}
                          onSelect={() => {
                            updateField("categoryId", category.id);
                            setCategoryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productData.categoryId === category.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {category.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Business Card Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Визитка (необязательно)</label>
            <Popover open={businessCardOpen} onOpenChange={handleBusinessCardOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={businessCardOpen}
                  className="w-full justify-between"
                >
                  {productData.businessCardId
                    ? businessCards.find((c) => c.id === productData.businessCardId)?.name
                    : "Товар для всех визиток"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Поиск визитки..." 
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>Визитка не найдена</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          updateField("businessCardId", "");
                          setBusinessCardOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !productData.businessCardId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Товар для всех визиток
                      </CommandItem>
                      {businessCards.map((card) => (
                        <CommandItem
                          key={card.id}
                          value={card.name}
                          onSelect={() => {
                            updateField("businessCardId", card.id);
                            setBusinessCardOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productData.businessCardId === card.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {card.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              Если визитка не выбрана, товар будет показываться на всех ваших визитках
            </p>
          </div>

          {/* Sale Type Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Тип продажи</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="saleType"
                  value="sell_only"
                  checked={productData.saleType === "sell_only"}
                  onChange={() => updateField("saleType", "sell_only")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Только продажа</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="saleType"
                  value="barter_goods"
                  checked={productData.saleType === "barter_goods"}
                  onChange={() => updateField("saleType", "barter_goods")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Бартер товар-товар</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="saleType"
                  value="barter_coin"
                  checked={productData.saleType === "barter_coin"}
                  onChange={() => updateField("saleType", "barter_coin")}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Бартер цифровой</span>
              </label>
            </div>

            {/* Coin Price Input - shown when barter_coin selected */}
            {productData.saleType === "barter_coin" && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Цена в долях (коинах)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={productData.coinPrice || ""}
                    onChange={(e) => updateField("coinPrice", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Укажите цену в долях"
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">долей</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Эта цена будет отображаться при цифровом обмене
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Изображение товара</label>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg transition-all duration-200
                ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                ${productData.image ? "p-2" : "p-8"}
              `}
            >
              {productData.image ? (
                <div className="relative group">
                  <img src={productData.image} alt="Товар" className="w-full h-48 object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          Заменить
                        </span>
                      </Button>
                    </label>
                    <Button type="button" variant="destructive" size="sm" onClick={handleDeleteImage}>
                      <X className="h-4 w-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Загрузка...</p>
                    </div>
                  ) : (
                    <>
                      <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">Перетащите изображение сюда или</p>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            Выберите файл
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP, GIF до 5MB</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Gallery Section */}
          <div className="mt-4">
            <label className="text-sm text-muted-foreground mb-2 block">
              Галерея изображений ({productData.galleryUrls.length} фото)
            </label>
            
            {/* Gallery Grid */}
            {productData.galleryUrls.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {productData.galleryUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img 
                      src={url} 
                      alt={`Галерея ${index + 1}`} 
                      className="w-full h-full object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add to Gallery */}
            <label className="cursor-pointer inline-block">
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleGalleryUpload}
                disabled={isUploading}
              />
              <Button type="button" variant="outline" size="sm" asChild disabled={isUploading}>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? "Загрузка..." : "Добавить в галерею"}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Можно выбрать несколько файлов
            </p>
          </div>
        </div>

        {/* Quill WYSIWYG Editor */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Подробное описание</h2>
          <p className="text-sm text-muted-foreground">
            Перетащите изображения прямо в редактор для быстрой загрузки
          </p>

          <div
            className={cn(
              "quill-editor-wrapper rounded-lg border transition-all",
              isEditorDragging ? "border-primary bg-primary/5" : "border-border"
            )}
            onDragOver={handleEditorDragOver}
            onDragLeave={handleEditorDragLeave}
            onDrop={handleEditorDrop}
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={productData.content}
              onChange={handleContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Подробное описание товара..."
            />
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Предпросмотр товара</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {productData.image && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={productData.image} alt="Товар" className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-foreground">{productData.name || "Название товара"}</h2>
              <p className="text-muted-foreground mt-1">{productData.description || "Описание товара"}</p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{productData.price || 0} ₽</span>
              <span className="text-muted-foreground">/ {productData.unit || "шт"}</span>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Производитель: {mockAPIProductPreviewData.producerName}</p>
              <p>Телефон: {mockAPIProductPreviewData.phone}</p>
            </div>

            {productData.content && (
              <div className="border-t border-border pt-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: productData.content,
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ProductEditor;
