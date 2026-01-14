import { useState, useCallback, useEffect } from "react";
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
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import { cn } from "@/lib/utils";
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
  Inbox,
  Check,
  ChevronsUpDown,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  content: string;
  categoryId: string;
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

// Данные для предпросмотра
const mockAPIProductPreviewData = {
  producerName: "Фермерское хозяйство «Заря»",
  phone: "+7 (999) 123-45-67",
};

// Toolbar Button Component
const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
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
    content: "",
    categoryId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(!isNew);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(isNew ? null : id || null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

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
    content: productData.content,
    onUpdate: ({ editor }) => {
      setProductData((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  // Загрузка данных товара при редактировании
  useEffect(() => {
    const loadProductData = async () => {
      if (id && id !== "new") {
        setIsDataLoading(true);
        try {
          const data = await getProduct(id);
          if (data) {
            setProductData({
              name: data.name,
              description: data.description || "",
              price: data.price || 0,
              unit: data.unit || "шт",
              image: data.image_url || "",
              content: data.content || "",
              categoryId: data.category_id || "",
            });
            setProductId(data.id);
            if (editor && data.content) {
              editor.commands.setContent(data.content);
            }
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
  }, [id, editor, navigate, toast, getProduct]);

  useEffect(() => {
    if (editor && productData.content && !isNew && !isDataLoading) {
      editor.commands.setContent(productData.content);
    }
  }, [editor, productData.content, isNew, isDataLoading]);

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setProductData((prev) => ({ ...prev, [field]: value }));
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

    setIsLoading(true);
    try {
      const saveData = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        unit: productData.unit,
        image_url: productData.image,
        category_id: productData.categoryId || null,
        content: productData.content,
      };

      if (isNew || !productId) {
        const newProduct = await createProduct(saveData);
        if (newProduct) {
          setProductId(newProduct.id);
          navigate(`/dashboard/product/${newProduct.id}`, { replace: true });
        }
      } else {
        await updateProduct(productId, saveData);
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

    // For now, just create a local URL (Storage not implemented)
    setIsUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      updateField("image", localUrl);
      toast({
        title: "Загружено",
        description: "Изображение добавлено (локально)",
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
      updateField("image", "");
      toast({
        title: "Удалено",
        description: "Изображение удалено",
      });
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
                <Command>
                  <CommandInput placeholder="Поиск категории..." />
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
                  <img src={productData.image} alt="Товар" className="w-full max-h-48 object-cover rounded-lg" />
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

            {/* URL Input */}
            <div className="flex gap-2 mt-3">
              <Input
                value={productData.image}
                onChange={(e) => updateField("image", e.target.value)}
                placeholder="Или вставьте URL изображения"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* TipTap WYSIWYG Editor */}
        <div className="content-card space-y-4">
          <h2 className="font-semibold text-foreground">Подробное описание</h2>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg border border-border">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
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

            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
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
          <div className="border border-border rounded-lg bg-background min-h-[200px]">
            <EditorContent editor={editor} />
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

            {editor?.getHTML() && (
              <div className="border-t border-border pt-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: editor.getHTML(),
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
