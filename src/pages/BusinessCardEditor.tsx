import { useState, useCallback, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save,
  ArrowLeft,
  Eye,
  Upload,
  X,
  ImagePlus,
  Check,
  ChevronsUpDown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JoditEditorComponent } from "@/components/editor/JoditEditorComponent";

interface Category {
  id: string;
  name: string;
}

interface City {
  id: number;
  name: string;
  type: string;
  region_id: number | null;
}

interface Region {
  id: number;
  country: string;
  republic: string | null;
  oblast: string | null;
  district: string | null;
}

interface BusinessCardData {
  id?: string;
  title: string;
  description: string;
  image: string;
  content: string; // HTML string for Jodit
  categoryId: string;
  cityId: string | null;
  city: string;
  location: string;
}

// Валидация файла изображения
const validateImage = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Неподдерживаемый формат. Используйте JPG, PNG, WebP или GIF" };
  }
  if (file.size > maxSize) {
    return { valid: false, error: "Файл слишком большой. Максимум 5MB" };
  }
  return { valid: true };
};

// No longer needed - Jodit outputs HTML directly

const BusinessCardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [cardData, setCardData] = useState<BusinessCardData>({
    title: "",
    description: "",
    image: "",
    content: "", // HTML string
    categoryId: "",
    cityId: null,
    city: "",
    location: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(!isNew);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const editorKeyRef = useRef(0);

  // Загрузка городов по региону
  const loadCities = useCallback(async (regionId: number) => {
    const { data: citiesData } = await supabase
      .from('city')
      .select('id, name, type')
      .eq('region_id', regionId)
      .order('name');
    
    if (citiesData) {
      setCities(citiesData);
    }
  }, []);

  // Загрузка всех городов
  const loadAllCities = useCallback(async () => {
    const { data: citiesData } = await supabase
      .from('city')
      .select('id, name, type')
      .order('name');
    
    if (citiesData) {
      setCities(citiesData);
    }
  }, []);

  // Загрузка регионов
  const loadRegions = useCallback(async () => {
    const { data: regionsData } = await supabase
      .from('region')
      .select('id, country, republic, oblast, district')
      .order('oblast')
      .order('republic');
    
    if (regionsData) {
      setRegions(regionsData);
    }
  }, []);

  // Загрузка категорий и профиля пользователя
  useEffect(() => {
    const loadInitialData = async () => {
      // Загрузка категорий
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_hidden', false)
        .order('position');
      
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Загрузка регионов
      await loadRegions();

      // Для новой визитки подставляем город из профиля владельца
      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        console.log("[BusinessCardEditor] Loading profile for new business, user:", user?.id);
        if (user) {
          // Получаем профиль с city_id и region_id
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('city_id, region_id, address')
            .eq('user_id', user.id)
            .maybeSingle();
          
          console.log("[BusinessCardEditor] Profile data:", profile, "Error:", profileError);
          
          // Если у пользователя есть city_id - используем его
          if (profile && profile.city_id) {
            console.log("[BusinessCardEditor] User has city_id:", profile.city_id);
            // Получаем город и его регион
            const { data: cityData } = await supabase
              .from('city')
              .select('id, name, region_id')
              .eq('id', profile.city_id)
              .maybeSingle();
            
            console.log("[BusinessCardEditor] City data:", cityData);
            
            if (cityData) {
              // Загружаем города этого региона
              const { data: citiesData } = await supabase
                .from('city')
                .select('id, name, type')
                .eq('region_id', cityData.region_id)
                .order('name');
              
              console.log("[BusinessCardEditor] Cities for region:", citiesData);
              
              if (citiesData) {
                setCities(citiesData);
              }
              
              // DEBUG: Log what we're setting
              const newCityId = String(cityData.id);
              console.log("[BusinessCardEditor] Setting cityId to:", newCityId, "city name:", cityData.name);
              console.log("[BusinessCardEditor] Current cities state:", citiesData?.map(c => ({id: c.id, name: c.name})));
              
              setCardData(prev => ({
                ...prev,
                cityId: newCityId,
                city: cityData.name,
                location: profile.address || "",
              }));
              console.log("[BusinessCardEditor] Set cardData with city:", cityData.id, cityData.name);
            }
          } else if (profile?.region_id) {
            // Если есть region_id но нет city_id - загружаем города региона
            const { data: citiesData } = await supabase
              .from('city')
              .select('id, name, type')
              .eq('region_id', profile.region_id)
              .order('name');
            
            if (citiesData) {
              setCities(citiesData);
            }
            
            if (profile?.address) {
              setCardData(prev => ({
                ...prev,
                location: profile.address || "",
              }));
            }
          } else if (profile?.address) {
            setCardData(prev => ({
              ...prev,
              location: profile.address || "",
            }));
            // Загружаем все города если у пользователя нет city_id
            await loadAllCities();
          } else {
            // Загружаем все города если профиль пустой
            await loadAllCities();
          }
        }
      }
    };
    loadInitialData();
  }, [isNew, loadAllCities, loadRegions]);

  // Загрузка данных визитки при редактировании
  useEffect(() => {
    const loadCardData = async () => {
      if (isNew) {
        setIsDataLoading(false);
        return;
      }
      
      if (id) {
        setIsDataLoading(true);
        try {
          // Загружаем визитку и профиль параллельно
          const { data: { user } } = await supabase.auth.getUser();
          
          const [businessResult, profileResult] = await Promise.all([
            supabase.from('businesses').select('*').eq('id', id).maybeSingle(),
            user ? supabase.from('profiles').select('city_id, address').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          if (businessResult.error) throw businessResult.error;
          
          const data = businessResult.data;
          const profile = profileResult.data;
          
          // Получаем название города из профиля
          let profileCityName = "";
          if (profile?.city_id) {
            const { data: cityData } = await supabase
              .from('city')
              .select('name')
              .eq('id', profile.city_id)
              .maybeSingle();
            profileCityName = cityData?.name || "";
          }
          
          if (data) {
            const contentJson = data.content_json as Record<string, unknown> || {};
            
            // Parse content - handle both HTML string and legacy EditorJS format
            let htmlContent = "";
            const rawContent = contentJson.content;
            
            if (typeof rawContent === "string") {
              // Already HTML string
              htmlContent = rawContent;
            } else if (rawContent && typeof rawContent === "object" && "blocks" in (rawContent as Record<string, unknown>)) {
              // Legacy Editor.js format - convert to HTML
              const blocks = (rawContent as { blocks: Array<{ type: string; data: Record<string, unknown> }> }).blocks || [];
              htmlContent = blocks.map(block => {
                switch (block.type) {
                  case "header":
                    const level = block.data.level || 2;
                    return `<h${level}>${block.data.text}</h${level}>`;
                  case "paragraph":
                    return `<p>${block.data.text}</p>`;
                  case "list":
                    const tag = block.data.style === "ordered" ? "ol" : "ul";
                    const items = (block.data.items as string[]).map((item: string) => `<li>${item}</li>`).join("");
                    return `<${tag}>${items}</${tag}>`;
                  case "quote":
                    return `<blockquote>${block.data.text}${block.data.caption ? `<cite>${block.data.caption}</cite>` : ""}</blockquote>`;
                  case "image":
                    const imgData = block.data.file as { url: string } | undefined;
                    const imgStyle = block.data.width ? `width: ${block.data.width}px;` : "";
                    return `<figure><img src="${imgData?.url || ""}" alt="${block.data.caption || ""}" style="${imgStyle}" /></figure>`;
                  default:
                    return "";
                }
              }).join("");
            }
            
          // Если у визитки нет city_id - используем профиль пользователя
          let finalCityId: string | null = data.city_id ? String(data.city_id) : null;
          let finalCityName = data.city_name || profileCityName || "";
          let finalLocation = data.location || profile?.address || "";
          
          // Если у визитки нет города, но в профиле есть city_id - используем его
          if (!data.city_id && profile?.city_id) {
            console.log("[BusinessCardEditor] Using city from profile:", profile.city_id);
            finalCityId = String(profile.city_id);
            finalCityName = profileCityName;
            // Загружаем города региона профиля
            const { data: profileCityData } = await supabase
              .from('city')
              .select('region_id')
              .eq('id', profile.city_id)
              .maybeSingle();
            
            if (profileCityData?.region_id) {
              setSelectedRegionId(profileCityData.region_id);
              const { data: profileCities } = await supabase
                .from('city')
                .select('id, name, type')
                .eq('region_id', profileCityData.region_id)
                .order('name');
              
              if (profileCities) {
                setCities(profileCities);
              }
            }
          } else if (!data.city_id && profile?.region_id) {
            // Если в профиле только region_id без city_id
            const { data: profileCities } = await supabase
              .from('city')
              .select('id, name, type')
              .eq('region_id', profile.region_id)
              .order('name');
            
            if (profileCities) {
              setCities(profileCities);
            }
          } else if (!data.city_id) {
            // Если нет города ни в визитке, ни в профиле - загружаем все города
            await loadAllCities();
          }
            
            const loaded: BusinessCardData = {
              id: data.id,
              title: data.name,
              description: (contentJson.description as string) || "",
              image: (contentJson.image as string) || "",
              content: htmlContent,
              categoryId: data.category_id || "",
              cityId: finalCityId,
              city: finalCityName,
              location: finalLocation,
            };
            
            setCardData(loaded);
            editorKeyRef.current += 1;
          } else {
            toast({
              title: "Ошибка",
              description: "Визитка не найдена",
              variant: "destructive",
            });
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Error loading business card:", error);
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить данные визитки",
            variant: "destructive",
          });
          navigate("/dashboard");
        } finally {
          setIsDataLoading(false);
        }
      }
    };

    loadCardData();
  }, [id, isNew, navigate, toast, loadCities, loadAllCities]);

  const updateField = <K extends keyof BusinessCardData>(field: K, value: BusinessCardData[K]) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  // Обработчик изменения региона
  const handleRegionChange = useCallback(async (regionId: string) => {
    const regionIdNum = Number(regionId);
    setSelectedRegionId(regionIdNum);
    setCardData(prev => ({ 
      ...prev, 
      cityId: null,
      city: ""
    }));
    await loadCities(regionIdNum);
  }, [loadCities]);

  // Обработчик изменения города
  const handleCityChange = useCallback(async (cityId: string) => {
    const city = cities.find(c => c.id === Number(cityId));
    setCardData(prev => ({ 
      ...prev, 
      cityId: cityId, 
      city: city?.name || "" 
    }));
  }, [cities]);

  const handleEditorChange = useCallback((content: string) => {
    setCardData((prev) => ({ ...prev, content }));
  }, []);

  const handleSave = async () => {
    if (!cardData.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите название визитки",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Получаем название категории
      const selectedCategory = categories.find(c => c.id === cardData.categoryId);
      
      // Store HTML content directly
      const contentJson = {
        description: cardData.description,
        image: cardData.image,
        content: cardData.content || "",
      };

      if (isNew) {
        // Создаём новую визитку
        const { data: newBusiness, error } = await supabase
          .from('businesses')
          .insert([{
            owner_id: user.id,
            name: cardData.title,
            category: selectedCategory?.name || "",
            category_id: cardData.categoryId || null,
            city_id: cardData.cityId || null,
            city_name: cardData.city || "",
            location: cardData.location || "",
            content_json: contentJson,
            status: 'published',
          }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Сохранено",
          description: "Визитка создана",
        });
        navigate(`/dashboard/business-card/${newBusiness.id}`, { replace: true });
      } else {
        // Обновляем существующую
        const { error } = await supabase
          .from('businesses')
          .update({
            name: cardData.title,
            category: selectedCategory?.name || "",
            category_id: cardData.categoryId || null,
            city_id: cardData.cityId || null,
            city_name: cardData.city || "",
            location: cardData.location || "",
            content_json: contentJson,
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Сохранено",
          description: "Визитка обновлена",
        });
      }
    } catch (error) {
      console.error("Error saving business card:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить визитку",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    const validation = validateImage(file);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateField("image", publicUrl);
      toast({
        title: "Загружено",
        description: "Изображение успешно загружено",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
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
    updateField("image", "");
    toast({
      title: "Удалено",
      description: "Изображение удалено",
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

  // Upload image for editor
  const uploadEditorImage = useCallback(async (file: File): Promise<string | null> => {
    const validation = validateImage(file);
    if (!validation.valid) {
      toast({
        title: "Ошибка",
        description: validation.error,
        variant: "destructive",
      });
      return null;
    }

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

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/editor-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      toast({
        title: "Загружено",
        description: "Изображение добавлено в редактор",
      });

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
  }, [toast]);

  // Upload video for editor
  const uploadEditorVideo = useCallback(async (file: File): Promise<string | null> => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ошибка",
        description: "Неподдерживаемый формат. Используйте MP4, WebM или OGG",
        variant: "destructive",
      });
      return null;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "Ошибка",
        description: "Файл слишком большой. Максимум 50MB",
        variant: "destructive",
      });
      return null;
    }

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

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/video-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      toast({
        title: "Загружено",
        description: "Видео добавлено в редактор",
      });

      return publicUrl;
    } catch (error) {
      console.error("Editor video upload error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить видео",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  if (isDataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              {isNew ? "Создание визитки" : "Редактирование визитки"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Предпросмотр
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>

        {/* Основные данные */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Основные данные</h2>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Название</label>
            <Input
              value={cardData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Название вашей визитки"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Краткое описание</label>
            <Textarea
              value={cardData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Краткое описание (будет отображаться в списке)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Город</label>
              {console.log("[BusinessCardEditor] Render Select - cityId:", cardData.cityId, "cities count:", cities.length, "cities:", cities.map(c => ({id: c.id, name: c.name})))}
              <Select 
                value={cardData.cityId || ""} 
                onValueChange={handleCityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={cities.length > 0 ? "Выберите город" : "Нет доступных городов"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={String(city.id)}>
                      {city.name} {city.type ? `(${city.type})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Адрес</label>
              <Input
                value={cardData.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Адрес"
              />
            </div>
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
                  {cardData.categoryId
                    ? categories.find(c => c.id === cardData.categoryId)?.name
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
                              cardData.categoryId === category.id ? "opacity-100" : "opacity-0"
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
        </div>

        {/* Изображение обложки */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Изображение обложки</h2>
          
          {cardData.image ? (
            <div className="relative">
              <img
                src={cardData.image}
                alt="Обложка"
                className="w-full h-48 object-contain rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleDeleteImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isUploading && "opacity-50 pointer-events-none"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Загрузка...</p>
                </div>
              ) : (
                <>
                  <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Перетащите изображение сюда или
                  </p>
                  <label>
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Выберите файл
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, WebP или GIF до 5MB
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Редактор контента - Jodit */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Содержимое</h2>
          <p className="text-sm text-muted-foreground">
            Чтобы вставить картинку нажмите три точки на панели инструментов
          </p>
          
          <JoditEditorComponent
            key={editorKeyRef.current}
            initialValue={cardData.content || ""}
            onChange={handleEditorChange}
            onVideoUpload={uploadEditorVideo}
            placeholder="Введите содержимое визитки..."
          />
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Предпросмотр визитки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cardData.image && (
              <img
                src={cardData.image}
                alt={cardData.title}
                className="w-full h-48 object-contain rounded-lg"
              />
            )}
            <h2 className="text-2xl font-bold">{cardData.title || "Без названия"}</h2>
            {cardData.description && (
              <p className="text-muted-foreground">{cardData.description}</p>
            )}
            {(cardData.city || cardData.location) && (
              <p className="text-sm text-muted-foreground">
                📍 {[cardData.city, cardData.location].filter(Boolean).join(", ")}
              </p>
            )}
            {cardData.content && (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: cardData.content }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessCardEditor;
