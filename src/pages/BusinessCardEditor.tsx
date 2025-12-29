import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Image,
  Link as LinkIcon,
  Save,
  ArrowLeft,
  Type,
  Palette
} from "lucide-react";

// === Mock API functions (заглушки для CRUD операций) ===

// Получение данных визитки по ID
const mockAPIGetBusinessCard = async (id: string) => {
  console.log("[mockAPI] Getting business card:", id);
  // Имитация загрузки существующей визитки
  if (id !== "new") {
    return {
      id,
      title: "Фермерское хозяйство",
      description: "Экологически чистые продукты с нашей фермы",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      content: "<h1>Добро пожаловать!</h1><p>Мы производим натуральные продукты.</p>",
    };
  }
  return null;
};

// Сохранение визитки
const mockAPISaveBusinessCard = async (data: BusinessCardData) => {
  console.log("[mockAPI] Saving business card:", data);
  // Имитация сохранения в БД
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true, id: data.id || "new-card-" + Date.now() };
};

// Удаление визитки
const mockAPIDeleteBusinessCard = async (id: string) => {
  console.log("[mockAPI] Deleting business card:", id);
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true };
};

// Загрузка изображения
const mockAPIUploadImage = async (file: File) => {
  console.log("[mockAPI] Uploading image:", file.name);
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Возвращаем заглушку URL
  return { url: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=300&fit=crop" };
};

interface BusinessCardData {
  id?: string;
  title: string;
  description: string;
  image: string;
  backgroundColor: string;
  textColor: string;
  content: string;
}

const BusinessCardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [cardData, setCardData] = useState<BusinessCardData>({
    title: "",
    description: "",
    image: "",
    backgroundColor: "#ffffff",
    textColor: "#1a1a1a",
    content: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateField = <K extends keyof BusinessCardData>(field: K, value: BusinessCardData[K]) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await mockAPISaveBusinessCard({ ...cardData, id });
      toast({
        title: "Сохранено",
        description: isNew ? "Визитка создана" : "Визитка обновлена",
      });
      if (isNew && result.id) {
        navigate(`/dashboard/business-card/${result.id}`, { replace: true });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить визитку",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await mockAPIUploadImage(file);
      updateField("image", result.url);
    }
  };

  const insertFormatting = (tag: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = cardData.content.substring(start, end);
      const before = cardData.content.substring(0, start);
      const after = cardData.content.substring(end);
      const formatted = `<${tag}>${selected}</${tag}>`;
      updateField("content", before + formatted + after);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4">
            <div className="content-card space-y-4">
              <h2 className="font-semibold text-foreground">Основные данные</h2>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Название</label>
                <Input
                  value={cardData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Название визитки"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Описание</label>
                <Textarea
                  value={cardData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Краткое описание"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Изображение</label>
                <div className="flex gap-2">
                  <Input
                    value={cardData.image}
                    onChange={(e) => updateField("image", e.target.value)}
                    placeholder="URL изображения"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Image className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <div className="content-card space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Стиль
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Цвет фона</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cardData.backgroundColor}
                      onChange={(e) => updateField("backgroundColor", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={cardData.backgroundColor}
                      onChange={(e) => updateField("backgroundColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Цвет текста</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cardData.textColor}
                      onChange={(e) => updateField("textColor", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={cardData.textColor}
                      onChange={(e) => updateField("textColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="content-card space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Type className="h-4 w-4" />
                Контент
              </h2>
              
              {/* Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("strong")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("em")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("u")}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("h1")}
                >
                  H1
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("h2")}
                >
                  H2
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertFormatting("p")}
                >
                  P
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = prompt("Введите URL ссылки:");
                    if (url) {
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selected = cardData.content.substring(start, end) || "ссылка";
                        const before = cardData.content.substring(0, start);
                        const after = cardData.content.substring(end);
                        updateField("content", before + `<a href="${url}">${selected}</a>` + after);
                      }
                    }
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                name="content"
                value={cardData.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="<h1>Заголовок</h1><p>Текст визитки...</p>"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="content-card">
              <h2 className="font-semibold text-foreground mb-4">Предпросмотр</h2>
              
              <div
                className="rounded-lg border border-border overflow-hidden min-h-[400px]"
                style={{
                  backgroundColor: cardData.backgroundColor,
                  color: cardData.textColor,
                }}
              >
                {cardData.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={cardData.image}
                      alt={cardData.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  {cardData.title && (
                    <h1 className="text-2xl font-bold mb-2">{cardData.title}</h1>
                  )}
                  {cardData.description && (
                    <p className="text-sm opacity-80 mb-4">{cardData.description}</p>
                  )}
                  {cardData.content && (
                    <div
                      className="prose prose-sm max-w-none"
                      style={{ color: cardData.textColor }}
                      dangerouslySetInnerHTML={{ __html: cardData.content }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BusinessCardEditor;
