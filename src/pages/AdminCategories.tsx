import { useState, useEffect, useCallback } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  Folder,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Тип категории из Supabase
interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  image_url: string | null;
  count?: number;
  position: number;
  is_hidden: boolean;
  cities?: string[] | null;
  parent_id: string | null;
  created_at: string;
  children?: CategoryRow[];
  expanded?: boolean;
  level?: number;
}

const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop";

const AdminCategories = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null);
  const [allCategories, setAllCategories] = useState<CategoryRow[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    icon: "folder",
    image_url: "",
    parent_id: "" as string | null,
    is_hidden: false,
    position: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (file: File) => {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ошибка",
        description: "Неподдерживаемый формат. Используйте JPG, PNG, WebP или GIF",
        variant: "destructive",
      });
      return null;
    }
    if (file.size > maxSize) {
      toast({
        title: "Ошибка",
        description: "Файл слишком большой. Максимум 5MB",
        variant: "destructive",
      });
      return null;
    }

    setUploadingImage(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("category-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить изображение",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        setFormData(prev => ({ ...prev, image_url: url }));
        toast({
          title: "Успех",
          description: "Изображение загружено",
        });
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("position");

    if (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить категории",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const categoriesData: CategoryRow[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      image_url: c.image_url,
      count: c.count,
      position: c.position,
      is_hidden: c.is_hidden,
      cities: c.cities,
      parent_id: c.parent_id || null,
      created_at: c.created_at,
    }));
    setAllCategories(categoriesData);
    
    const buildTree = (items: CategoryRow[], parentId: string | null = null, level = 0): CategoryRow[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          level,
          expanded: false,
          children: buildTree(items, item.id, level + 1),
        }))
        .sort((a, b) => a.position - b.position);
    };

    const tree = buildTree(categoriesData);
    setCategories(tree);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenDialog = (category?: CategoryRow) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon,
        image_url: category.image_url || "",
        parent_id: category.parent_id || "",
        is_hidden: category.is_hidden,
        position: category.position,
      });
    } else {
      setEditingCategory(null);
      const nextPosition = allCategories.filter(c => !c.parent_id).length;
      setFormData({
        name: "",
        icon: "folder",
        image_url: "",
        parent_id: "",
        is_hidden: false,
        position: nextPosition,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название категории",
        variant: "destructive",
      });
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      icon: formData.icon,
      image_url: formData.image_url || null,
      parent_id: formData.parent_id || null,
      is_hidden: formData.is_hidden,
      position: formData.position,
    };

    let error;

    if (editingCategory) {
      const { error: updateError } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("categories")
        .insert(categoryData);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успех",
      description: editingCategory ? "Категория обновлена" : "Категория создана",
    });
    
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    const hasChildren = allCategories.some(c => c.parent_id === deletingCategory.id);
    if (hasChildren) {
      toast({
        title: "Ошибка",
        description: "Нельзя удалить категорию с дочерними элементами",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", deletingCategory.id);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Успех",
        description: "Категория удалена",
      });
    }

    setDeleteDialogOpen(false);
    setDeletingCategory(null);
    fetchCategories();
  };

  const handleMoveUp = async (category: CategoryRow) => {
    const siblings = getSiblings(categories, category.parent_id);
    const currentIndex = siblings.findIndex(c => c.id === category.id);
    if (currentIndex <= 0) return;

    const prevSibling = siblings[currentIndex - 1];
    
    await supabase
      .from("categories")
      .update({ position: category.position })
      .eq("id", prevSibling.id);

    await supabase
      .from("categories")
      .update({ position: prevSibling.position })
      .eq("id", category.id);

    fetchCategories();
  };

  const handleMoveDown = async (category: CategoryRow) => {
    const siblings = getSiblings(categories, category.parent_id);
    const currentIndex = siblings.findIndex(c => c.id === category.id);
    if (currentIndex >= siblings.length - 1) return;

    const nextSibling = siblings[currentIndex + 1];
    
    await supabase
      .from("categories")
      .update({ position: category.position })
      .eq("id", nextSibling.id);

    await supabase
      .from("categories")
      .update({ position: nextSibling.position })
      .eq("id", category.id);

    fetchCategories();
  };

  const handleChangeParent = async (category: CategoryRow, newParentId: string | null) => {
    const siblings = getSiblings(categories, newParentId);
    const newPosition = siblings.length;

    const { error } = await supabase
      .from("categories")
      .update({ 
        parent_id: newParentId,
        position: newPosition 
      })
      .eq("id", category.id);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успех",
      description: "Категория перемещена",
    });

    fetchCategories();
  };

  const handleIndent = async (category: CategoryRow) => {
    const siblings = getSiblings(categories, category.parent_id);
    const currentIndex = siblings.findIndex(c => c.id === category.id);
    if (currentIndex <= 0) return;

    const prevSibling = siblings[currentIndex - 1];
    await handleChangeParent(category, prevSibling.id);
  };

  const handleOutdent = async (category: CategoryRow) => {
    if (!category.parent_id) return;

    const parent = allCategories.find(c => c.id === category.parent_id);
    if (!parent) return;

    await handleChangeParent(category, parent.parent_id);
  };

  const getSiblings = (cats: CategoryRow[], parentId: string | null): CategoryRow[] => {
    if (parentId === null) {
      return cats.filter(c => !c.parent_id);
    }
    const parent = cats.find(c => c.id === parentId);
    return parent?.children || [];
  };

  const toggleExpand = (categoryId: string) => {
    const toggle = (cats: CategoryRow[]): CategoryRow[] => {
      return cats.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, expanded: !cat.expanded };
        }
        if (cat.children) {
          return { ...cat, children: toggle(cat.children) };
        }
        return cat;
      });
    };
    setCategories(prev => toggle(prev));
  };

  const renderCategoryRow = (category: CategoryRow, index: number) => {
    const hasChildren = category.children && category.children.length > 0;
    const indent = (category.level || 0) * 24;

    return (
      <>
        <TableRow key={category.id}>
          <TableCell style={{ paddingLeft: `${indent + 8}px` }}>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => hasChildren && toggleExpand(category.id)}
              >
                {hasChildren ? (
                  category.expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )
                ) : (
                  <span className="w-3" />
                )}
              </Button>
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <img
                src={category.image_url || DEFAULT_CATEGORY_IMAGE}
                alt=""
                className="w-6 h-6 rounded object-cover"
              />
              <span className="font-medium">{category.name}</span>
              {category.is_hidden && (
                <span className="text-xs text-muted-foreground ml-2">(скрыта)</span>
              )}
            </div>
          </TableCell>
          <TableCell>
            {category.parent_id 
              ? allCategories.find(c => c.id === category.parent_id)?.name || "—"
              : "—"
            }
          </TableCell>
          <TableCell className="text-center">
            <span className="text-muted-foreground">{category.position}</span>
          </TableCell>
          <TableCell>
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMoveUp(category)}
                title="Переместить выше"
              >
                <ChevronDown className="h-3 w-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMoveDown(category)}
                title="Переместить ниже"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              {category.level && category.level > 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleOutdent(category)}
                  title="Сделать родительской"
                >
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleIndent(category)}
                  title="Сделать дочерней"
                  disabled={index === 0}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleOpenDialog(category)}
                title="Редактировать"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  setDeletingCategory(category);
                  setDeleteDialogOpen(true);
                }}
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && category.expanded && (
          category.children!.map(child => renderCategoryRow(child, 0))
        )}
      </>
    );
  };

  const flatCategoriesForSelect = (cats: CategoryRow[], result: { value: string; label: string }[] = []) => {
    cats.forEach(cat => {
      const indent = "— ".repeat(cat.level || 0);
      result.push({ value: cat.id, label: `${indent}${cat.name}` });
      if (cat.children) {
        flatCategoriesForSelect(cat.children, result);
      }
    });
    return result;
  };

  const parentOptions = [
    { value: "", label: "Без родителя (корневая)" },
    ...flatCategoriesForSelect(categories),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={fetchCategories} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить категорию
        </Button>
      </div>

      <div className="content-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет категорий</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первую категорию
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Родитель</TableHead>
                <TableHead className="text-center w-[80px]">Позиция</TableHead>
                <TableHead className="w-[180px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, index) => renderCategoryRow(cat, index))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Редактировать категорию" : "Новая категория"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Измените данные категории" : "Заполните данные новой категории"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Название категории"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Иконка</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="folder"
              />
            </div>
            <div className="space-y-2">
              <Label>Изображение категории</Label>
              <div className="flex items-start gap-4">
                {formData.image_url ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="image_upload"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image_upload">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      asChild
                    >
                      <span className="cursor-pointer">
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Загрузить изображение
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP до 5MB
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_id">Родительская категория</Label>
              <select
                id="parent_id"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.parent_id || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
              >
                {parentOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Позиция</Label>
              <Input
                id="position"
                type="number"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_hidden"
                checked={formData.is_hidden}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_hidden: checked }))}
              />
              <Label htmlFor="is_hidden">Скрыть категорию</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              {editingCategory ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDesc>
              Вы уверены, что хотите удалить категорию <strong>{deletingCategory?.name}</strong>?
              Это действие нельзя отменить.
            </AlertDesc>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
