import { useState, useCallback, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { OutputData } from "@editorjs/editorjs";
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
import { EditorJSComponent } from "@/components/editor/EditorJSComponent";

interface Category {
  id: string;
  name: string;
}

interface BusinessCardData {
  id?: string;
  title: string;
  description: string;
  image: string;
  content: OutputData | null;
  categoryId: string;
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

// Convert Editor.js data to HTML for preview
const editorDataToHtml = (data: OutputData | null): string => {
  if (!data?.blocks) return "";
  
  return data.blocks.map(block => {
    switch (block.type) {
      case "header":
        const level = block.data.level || 2;
        return `<h${level}>${block.data.text}</h${level}>`;
      case "paragraph":
        return `<p>${block.data.text}</p>`;
      case "list":
        const tag = block.data.style === "ordered" ? "ol" : "ul";
        const items = block.data.items.map((item: string) => `<li>${item}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      case "quote":
        return `<blockquote>${block.data.text}${block.data.caption ? `<cite>${block.data.caption}</cite>` : ""}</blockquote>`;
      case "image":
        const imgStyle = block.data.width ? `width: ${block.data.width}px;` : "";
        return `<figure><img src="${block.data.file?.url}" alt="${block.data.caption || ""}" style="${imgStyle}" />${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ""}</figure>`;
      default:
        return "";
    }
  }).join("");
};

const BusinessCardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [cardData, setCardData] = useState<BusinessCardData>({
    title: "",
    description: "",
    image: "",
    content: null,
    categoryId: "",
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
  const editorKeyRef = useRef(0);

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

      // Для новой визитки подставляем город из профиля владельца
      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('city, address')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (profile) {
            setCardData(prev => ({
              ...prev,
              city: profile.city || "",
              location: profile.address || "",
            }));
          }
        }
      }
    };
    loadInitialData();
  }, [isNew]);

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
            user ? supabase.from('profiles').select('city, address').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          if (businessResult.error) throw businessResult.error;
          
          const data = businessResult.data;
          const profile = profileResult.data;
          
          if (data) {
            const contentJson = data.content_json as Record<string, unknown> || {};
            
            // Parse content - try EditorJS format first, then HTML
            let editorContent: OutputData | null = null;
            const rawContent = contentJson.content;
            
            if (rawContent && typeof rawContent === "object" && "blocks" in (rawContent as object)) {
              // Already Editor.js format
              editorContent = rawContent as OutputData;
            } else if (typeof rawContent === "string" && rawContent.trim()) {
              // HTML string - convert to Editor.js format (simple paragraph)
              editorContent = {
                time: Date.now(),
                blocks: [
                  {
                    type: "paragraph",
                    data: { text: rawContent },
                  },
                ],
                version: "2.28.0",
              };
            }
            
            const loaded: BusinessCardData = {
              id: data.id,
              title: data.name,
              description: (contentJson.description as string) || "",
              image: (contentJson.image as string) || "",
              content: editorContent,
              categoryId: data.category_id || "",
              // Подставляем город из профиля, если в визитке он пустой
              city: data.city || profile?.city || "",
              location: data.location || profile?.address || "",
            };
            setCardData(loaded);
            editorKeyRef.current += 1; // Force editor re-mount with new data
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
  }, [id, isNew, navigate, toast]);

  const updateField = <K extends keyof BusinessCardData>(field: K, value: BusinessCardData[K]) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditorChange = useCallback((data: OutputData) => {
    setCardData((prev) => ({ ...prev, content: data }));
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
      
      // Convert OutputData to JSON-compatible format
      const contentJson = {
        description: cardData.description,
        image: cardData.image,
        content: cardData.content ? JSON.parse(JSON.stringify(cardData.content)) : null,
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
            city: cardData.city || "",
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
            city: cardData.city || "",
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
              <Input
                value={cardData.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Город"
              />
            </div>
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
                className="w-full h-48 object-cover rounded-lg"
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

        {/* Редактор контента - Editor.js */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Содержимое</h2>
          <p className="text-sm text-muted-foreground">
            Используйте "+" для добавления блоков. Перетаскивайте блоки для изменения порядка. Наведите на изображение для изменения размера.
          </p>
          
          <EditorJSComponent
            key={editorKeyRef.current}
            initialData={cardData.content || undefined}
            onChange={handleEditorChange}
            onImageUpload={uploadEditorImage}
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
                className="w-full h-48 object-cover rounded-lg"
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
                dangerouslySetInnerHTML={{ __html: editorDataToHtml(cardData.content) }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessCardEditor;
