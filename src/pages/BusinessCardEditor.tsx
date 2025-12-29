import { useState, useCallback } from "react";
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
  Quote
} from "lucide-react";

// === Mock API functions (заглушки для CRUD операций) ===

// Получение данных визитки по ID
const mockAPIGetBusinessCard = async (id: string) => {
  console.log("[mockAPI] Getting business card:", id);
  if (id !== "new") {
    return {
      id,
      title: "Фермерское хозяйство «Заря»",
      description: "Экологически чистые продукты с нашей фермы. Работаем с 2010 года.",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
      content: `<h2>О нашем хозяйстве</h2>
<p>Мы — семейная ферма, расположенная в экологически чистом районе Подмосковья. Наша миссия — обеспечить вас свежими, натуральными продуктами без химических добавок.</p>
<h3>Наша продукция</h3>
<ul>
<li>Молочные продукты: молоко, сметана, творог, сыр</li>
<li>Мясо и птица: говядина, свинина, курица</li>
<li>Овощи и фрукты: сезонные, выращенные без пестицидов</li>
<li>Мёд с собственной пасеки</li>
</ul>
<p><strong>Доставка</strong> осуществляется по всей Москве и области.</p>
<blockquote>Качество — наш главный приоритет!</blockquote>`,
    };
  }
  return null;
};

// Сохранение визитки
const mockAPISaveBusinessCard = async (data: BusinessCardData) => {
  console.log("[mockAPI] Saving business card:", data);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true, id: data.id || "new-card-" + Date.now() };
};

// Загрузка изображения
const mockAPIUploadImage = async (file: File) => {
  console.log("[mockAPI] Uploading image:", file.name);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { url: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=300&fit=crop" };
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

  if (!editor) {
    return null;
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
            <label className="text-sm text-muted-foreground mb-1 block">Обложка</label>
            <div className="flex gap-2">
              <Input
                value={cardData.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder="URL изображения обложки"
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
            {cardData.image && (
              <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
                <img src={cardData.image} alt="Обложка" className="w-full h-auto" />
              </div>
            )}
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
