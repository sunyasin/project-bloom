import { useState, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Image,
  Link as LinkIcon,
  Save,
  ArrowLeft,
  Eye,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Quote,
  Upload,
  X,
  ImagePlus
} from "lucide-react";

// === Mock API functions (заглушки для CRUD операций) ===

// База данных визиток (статические данные)
const mockAPIBusinessCardsDB: Record<string, BusinessCardData> = {
  "1": {
    id: "1",
    title: "Фермерское хозяйство",
    description: "Экологически чистые продукты с нашей фермы. Работаем с 2010 года.",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
    content: `<h2>О нашем хозяйстве</h2>
<p>Мы — семейная ферма, расположенная в экологически чистом районе Подмосковья. Наша миссия — обеспечить вас свежими, натуральными продуктами без химических добавок.</p>
<h3>Наша продукция</h3>
<ul>
<li>Молочные продукты: молоко, сметана, творог, сыр</li>
<li>Мясо и птица: говядина, свинина, курица</li>
<li>Овощи и фрукты: сезонные, выращенные без пестицидов</li>
</ul>
<p><strong>Доставка</strong> осуществляется по всей Москве и области.</p>`,
  },
  "2": {
    id: "2",
    title: "Молочная ферма",
    description: "Свежие молочные продукты каждый день",
    image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&h=400&fit=crop",
    content: `<h2>Молочная ферма «Буренка»</h2>
<p>Мы производим натуральные молочные продукты высочайшего качества.</p>
<ul>
<li>Молоко цельное</li>
<li>Сметана домашняя</li>
<li>Творог</li>
<li>Сыр фермерский</li>
</ul>
<blockquote>Свежесть и качество — наш приоритет!</blockquote>`,
  },
  "3": {
    id: "3",
    title: "Пасека Медовая",
    description: "Натуральный мёд с собственной пасеки",
    image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&h=400&fit=crop",
    content: `<h2>Пасека «Медовая»</h2>
<p>Мы занимаемся пчеловодством более 20 лет. Наш мёд — это 100% натуральный продукт.</p>
<h3>Виды мёда:</h3>
<ul>
<li>Липовый мёд</li>
<li>Цветочный мёд</li>
<li>Гречишный мёд</li>
<li>Акациевый мёд</li>
</ul>
<p>Доставка по всей России!</p>`,
  },
};

// Получение данных визитки по ID
const mockAPIGetBusinessCard = async (id: string): Promise<BusinessCardData | null> => {
  console.log("[mockAPI] Getting business card:", id);
  // Имитация задержки сети
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  if (id === "new") {
    return null;
  }
  
  return mockAPIBusinessCardsDB[id] || null;
};

// Сохранение визитки
const mockAPISaveBusinessCard = async (data: BusinessCardData) => {
  console.log("[mockAPI] Saving business card:", data);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true, id: data.id || "new-card-" + Date.now() };
};

// Загрузка изображения в хранилище
const mockAPIUploadImage = async (file: File): Promise<{ url: string }> => {
  console.log("[mockAPI] Uploading image to storage:", file.name, file.size);
  // Имитация загрузки файла в облачное хранилище
  await new Promise((resolve) => setTimeout(resolve, 800));
  // Возвращаем URL загруженного изображения
  return { url: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&h=400&fit=crop" };
};

// Удаление изображения из хранилища
const mockAPIDeleteImage = async (imageUrl: string): Promise<{ success: boolean }> => {
  console.log("[mockAPI] Deleting image from storage:", imageUrl);
  // Имитация удаления файла из хранилища
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true };
};

// Валидация файла изображения
const mockAPIValidateImage = (file: File): { valid: boolean; error?: string } => {
  console.log("[mockAPI] Validating image:", file.name, file.type, file.size);
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

// Данные для предпросмотра (статические)
const mockAPIPreviewData = {
  title: "Фермерское хозяйство «Заря»",
  description: "Экологически чистые продукты с нашей фермы",
  image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
  phone: "+7 (999) 123-45-67",
  email: "farm@example.com",
  address: "Московская область, д. Заречье",
};

interface BusinessCardData {
  id?: string;
  title: string;
  description: string;
  image: string;
  content: string;
}

// Toolbar Button Component
const ToolbarButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false,
  children 
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="icon"
    className="h-8 w-8"
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </Button>
);

const BusinessCardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [cardData, setCardData] = useState<BusinessCardData>({
    title: "",
    description: "",
    image: "",
    content: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(!isNew);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
    ],
    content: cardData.content,
    onUpdate: ({ editor }) => {
      setCardData((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  // Загрузка данных визитки при редактировании
  useEffect(() => {
    const loadCardData = async () => {
      if (id && id !== "new") {
        setIsDataLoading(true);
        try {
          const data = await mockAPIGetBusinessCard(id);
          if (data) {
            setCardData(data);
            // Устанавливаем контент в редактор после загрузки
            if (editor && data.content) {
              editor.commands.setContent(data.content);
            }
          } else {
            toast({
              title: "Ошибка",
              description: "Визитка не найдена",
              variant: "destructive",
            });
            navigate("/dashboard");
          }
        } catch (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить данные визитки",
            variant: "destructive",
          });
        } finally {
          setIsDataLoading(false);
        }
      }
    };

    loadCardData();
  }, [id, editor, navigate, toast]);

  // Обновляем редактор когда данные загружены
  useEffect(() => {
    if (editor && cardData.content && !isNew && !isDataLoading) {
      editor.commands.setContent(cardData.content);
    }
  }, [editor, cardData.content, isNew, isDataLoading]);

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

  const uploadImage = async (file: File) => {
    const validation = mockAPIValidateImage(file);
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
      const result = await mockAPIUploadImage(file);
      updateField("image", result.url);
      toast({
        title: "Загружено",
        description: "Изображение успешно загружено",
      });
    } catch (error) {
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
    if (cardData.image) {
      try {
        await mockAPIDeleteImage(cardData.image);
        updateField("image", "");
        toast({
          title: "Удалено",
          description: "Изображение удалено",
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить изображение",
          variant: "destructive",
        });
      }
    }
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

  const addImage = useCallback(() => {
    const url = prompt("Введите URL изображения:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes("link").href;
    const url = prompt("Введите URL ссылки:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor || isDataLoading) {
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
              <Save className="h-4 w-4 mr-2" />
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
              placeholder="Название визитки"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Краткое описание</label>
            <Textarea
              value={cardData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Краткое описание деятельности"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Обложка</label>
            
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg transition-all duration-200
                ${isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
                }
                ${cardData.image ? "p-2" : "p-8"}
              `}
            >
              {cardData.image ? (
                <div className="relative group">
                  <img 
                    src={cardData.image} 
                    alt="Обложка" 
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          Заменить
                        </span>
                      </Button>
                    </label>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteImage}
                    >
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
                      <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Перетащите изображение сюда или
                      </p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            Выберите файл
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG, WebP, GIF до 5MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* URL Input */}
            <div className="flex gap-2 mt-3">
              <Input
                value={cardData.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder="Или вставьте URL изображения"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* TipTap WYSIWYG Editor */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Содержимое визитки</h2>
          
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg border border-border">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px bg-border mx-1 h-8" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive("heading", { level: 1 })}
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive("heading", { level: 2 })}
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px bg-border mx-1 h-8" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px bg-border mx-1 h-8" />

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              isActive={editor.isActive({ textAlign: "center" })}
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px bg-border mx-1 h-8" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px bg-border mx-1 h-8" />

            <ToolbarButton onClick={setLink} isActive={editor.isActive("link")}>
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addImage}>
              <Image className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Editor Content */}
          <div className="border border-border rounded-lg bg-background min-h-[300px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Предпросмотр визитки</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview using mockAPI data */}
            {mockAPIPreviewData.image && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={cardData.image || mockAPIPreviewData.image}
                  alt="Обложка"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {cardData.title || mockAPIPreviewData.title}
              </h2>
              <p className="text-muted-foreground mt-1">
                {cardData.description || mockAPIPreviewData.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>📞 {mockAPIPreviewData.phone}</span>
              <span>✉️ {mockAPIPreviewData.email}</span>
              <span>📍 {mockAPIPreviewData.address}</span>
            </div>

            <div className="border-t border-border pt-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: editor?.getHTML() || "<p>Контент визитки будет отображаться здесь...</p>" 
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BusinessCardEditor;
