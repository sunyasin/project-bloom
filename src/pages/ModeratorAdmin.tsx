import { useState, useEffect } from "react";
import { 
  Building2, 
  Eye,
  RefreshCw,
  Send,
  MapPin,
  Home,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BusinessWithOwner extends Business {
  ownerEmail?: string;
  ownerName?: string;
}

interface Category {
  id: string;
  name: string;
}

const ModeratorContent = () => {
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUserWithRole();
  const [businesses, setBusinesses] = useState<BusinessWithOwner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithOwner | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [decision, setDecision] = useState<"approve" | "revise">("approve");
  const [reviseComment, setReviseComment] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Editing states
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedNewCategory, setEditedNewCategory] = useState("");
  const [newCategoryCreated, setNewCategoryCreated] = useState(false); // Флаг - категория уже создана через +
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null); // ID созданной категории
  const [isAddingCategory, setIsAddingCategory] = useState(false); // Защита от двойного нажатия
  const [editedCity, setEditedCity] = useState("");
  const [editedAddress, setEditedAddress] = useState("");

  const loadBusinesses = async () => {
    setLoading(true);
    
    // Load businesses with draft or moderation status
    const { data: businessesData, error } = await supabase
      .from("businesses")
      .select("*")
      .in("status", ["draft", "moderation"])
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading businesses:", error);
      toast({ title: "Ошибка", description: "Не удалось загрузить визитки", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get owner profiles
    const ownerIds = [...new Set((businessesData || []).map(b => b.owner_id).filter(Boolean))];
    let profilesMap: Record<string, { email: string; first_name: string; last_name: string }> = {};
    
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name")
        .in("user_id", ownerIds as string[]);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.user_id] = { email: p.email || "", first_name: p.first_name || "", last_name: p.last_name || "" };
          return acc;
        }, {} as Record<string, { email: string; first_name: string; last_name: string }>);
      }
    }

    const businessesWithOwner: BusinessWithOwner[] = (businessesData || []).map(b => ({
      ...b,
      ownerEmail: b.owner_id ? profilesMap[b.owner_id]?.email : undefined,
      ownerName: b.owner_id ? `${profilesMap[b.owner_id]?.first_name || ""} ${profilesMap[b.owner_id]?.last_name || ""}`.trim() : undefined,
    }));

    setBusinesses(businessesWithOwner);
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    
    if (data) {
      setCategories(data);
    }
  };

  useEffect(() => {
    loadBusinesses();
    loadCategories();
  }, []);

  // Send notification to business owner
  const sendNotification = async (
    ownerId: string, 
    message: string, 
    type: "admin_status" | "from_admin" = "admin_status"
  ) => {
    if (!currentUser?.id || !ownerId) return;

    try {
      await supabase.from("messages").insert({
        from_id: currentUser.id,
        to_id: ownerId,
        message,
        type,
      });
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  // Функция для добавления новой категории в БД
  const handleAddNewCategory = async () => {
    if (isAddingCategory) return; // Защита от двойного нажатия
    if (!editedNewCategory.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название категории",
        variant: "destructive",
      });
      return;
    }

    setIsAddingCategory(true);

    try {
      // Получаем актуальный список категорий напрямую из БД
      const { data: freshCategories } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      
      const freshCategoriesList = freshCategories || [];
      console.log("Fresh categories from DB:", freshCategoriesList);
      
      const newCategoryTrimmed = editedNewCategory.trim();
      console.log("Looking for category:", newCategoryTrimmed);
      
      // Проверяем по актуальному списку
      const existingCat = freshCategoriesList.find(
        (c) => c.name.toLowerCase() === newCategoryTrimmed.toLowerCase()
      );

      if (existingCat) {
        console.log("Found existing category:", existingCat);
        toast({
          title: "Информация",
          description: `Категория уже существует: ${existingCat.name} (ID: ${existingCat.id})`,
        });
        setEditedCategory(existingCat.name);
        setNewCategoryCreated(true); // Категория уже существует, не создаём снова
        setCreatedCategoryId(existingCat.id); // Сохраняем ID категории
        setEditedNewCategory(""); // Очищаем поле ввода
        return;
      }

      // Создаём новую категорию
      const { data: newCat, error } = await supabase
        .from("categories")
        .insert({
          name: editedNewCategory.trim(),
          is_hidden: false,
          position: categories.length + 1,
        })
        .select("id, name")
        .single();

      if (error) throw error;

      if (newCat && newCat.id) {
        console.log("Created category:", newCat);
        // Debug toast
        toast({ 
          title: "Категория создана", 
          description: `ID: ${newCat.id}, Name: ${newCat.name}, newCategoryCreated: ${true}, createdCategoryId: ${newCat.id}` 
        });
        // Обновляем список категорий
        await loadCategories();
        
        // Устанавливаем новую категорию как выбранную
        setEditedCategory(newCat.name);
        setNewCategoryCreated(true); // Категория уже создана
        setCreatedCategoryId(newCat.id); // Сохраняем ID категории
        setEditedNewCategory(""); // Очищаем поле ввода
        
        toast({
          title: "Успешно",
          description: "Категория добавлена",
        });
        setIsAddingCategory(false);
      }
    } catch (err) {
      console.error("Error adding category:", err);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить категорию",
        variant: "destructive",
      });
      setIsAddingCategory(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedBusiness) return;
    setProcessing(true);
    
    // Determine final category
    let finalCategory = editedCategory;
    let categoryId: string | null = null;
    
    // Check if category is "other" or contains "другие"
    const isOtherCategory = editedCategory === "__other__" || editedCategory.toLowerCase().includes("другие");
    
    // Если категория уже была создана через + кнопку, просто используем её
    if (newCategoryCreated && createdCategoryId) {
      categoryId = createdCategoryId;
    } else if (newCategoryCreated) {
      const existingCat = categories.find(c => c.name === editedCategory);
      categoryId = existingCat?.id || null;
    } else if (isOtherCategory && editedNewCategory.trim()) {
      // Check if category already exists
      const existingCat = categories.find(c => c.name.toLowerCase() === editedNewCategory.trim().toLowerCase());
      if (existingCat) {
        finalCategory = existingCat.name;
        categoryId = existingCat.id;
      } else {
        // Create new category
        const { data: newCat, error: catError } = await supabase
          .from("categories")
          .insert({
            name: editedNewCategory.trim(),
            icon: "Tag",
            count: 0,
            position: categories.length + 1,
            is_hidden: false,
          })
          .select("id, name")
          .single();
        
        if (catError) {
          toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
          setProcessing(false);
          return;
        }
        
        finalCategory = newCat.name;
        categoryId = newCat.id;
        // Refresh categories list
        loadCategories();
      }
    } else {
      // Find category_id for selected category
      const existingCat = categories.find(c => c.name === editedCategory);
      categoryId = existingCat?.id || null;
    }

    const { error } = await supabase
      .from("businesses")
      .update({ 
        status: "published",
        category: finalCategory,
        category_id: categoryId,
        city_name: editedCity,
        location: editedAddress,
        content_json: {
          ...(selectedBusiness.content_json as object || {}),
          description: editedDescription,
        }
      })
      .eq("id", selectedBusiness.id);
    
    // Debug: show category info
    toast({ 
      title: "Отладка", 
      description: `categoryId: ${categoryId}, finalCategory: ${finalCategory}, newCategoryCreated: ${newCategoryCreated}, createdCategoryId: ${createdCategoryId}` 
    });
    
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      // Send notification to owner
      if (selectedBusiness.owner_id) {
        await sendNotification(
          selectedBusiness.owner_id,
          `✅ Ваша визитка "${selectedBusiness.name}" успешно прошла модерацию и опубликована!`
        );
      }
      
      toast({ title: "Успешно", description: `Визитка "${selectedBusiness.name}" опубликована` });
      setPreviewOpen(false);
      setSelectedBusiness(null);
      loadBusinesses();
    }
    
    setProcessing(false);
  };

  const handleRevise = async () => {
    if (!selectedBusiness) return;
    if (!reviseComment.trim()) {
      toast({ title: "Ошибка", description: "Введите комментарий", variant: "destructive" });
      return;
    }
    
    setProcessing(true);
    
    // Determine final category
    let finalCategory = editedCategory;
    let categoryId: string | null = null;
    
    // Check if category is "other" or contains "другие"
    const isOtherCategory = editedCategory === "__other__" || editedCategory.toLowerCase().includes("другие");
    
    // Если категория уже была создана через + кнопку, просто используем её
    if (newCategoryCreated && createdCategoryId) {
      categoryId = createdCategoryId;
    } else if (newCategoryCreated) {
      const existingCat = categories.find(c => c.name === editedCategory);
      categoryId = existingCat?.id || null;
    } else if (isOtherCategory && editedNewCategory.trim()) {
      // Check if category already exists
      const existingCat = categories.find(c => c.name.toLowerCase() === editedNewCategory.trim().toLowerCase());
      if (existingCat) {
        finalCategory = existingCat.name;
        categoryId = existingCat.id;
      } else {
        // Create new category
        const { data: newCat, error: catError } = await supabase
          .from("categories")
          .insert({
            name: editedNewCategory.trim(),
            icon: "Tag",
            count: 0,
            position: categories.length + 1,
            is_hidden: false,
          })
          .select("id, name")
          .single();
        
        if (catError) {
          toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
          setProcessing(false);
          return;
        }
        
        finalCategory = newCat.name;
        categoryId = newCat.id;
        // Refresh categories list
        loadCategories();
      }
    } else {
      // Find category_id for selected category
      const existingCat = categories.find(c => c.name === editedCategory);
      categoryId = existingCat?.id || null;
    }

    // Update status to draft (pending for revision)
    const { error } = await supabase
      .from("businesses")
      .update({ 
        status: "draft",
        category: finalCategory,
        category_id: categoryId,
        city_name: editedCity,
        location: editedAddress,
        content_json: {
          ...(selectedBusiness.content_json as object || {}),
          description: editedDescription,
          moderator_comment: reviseComment,
          rejected_at: new Date().toISOString(),
        }
      })
      .eq("id", selectedBusiness.id);
    
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      // Send notification to owner with comment
      if (selectedBusiness.owner_id) {
        await sendNotification(
          selectedBusiness.owner_id,
          `⚠️ Ваша визитка "${selectedBusiness.name}" отправлена на доработку.\n\nКомментарий модератора:\n${reviseComment}`
        );
      }
      
      toast({ title: "Отправлено на доработку", description: `Визитка "${selectedBusiness.name}" возвращена владельцу` });
      setPreviewOpen(false);
      setSelectedBusiness(null);
      setReviseComment("");
      setDecision("approve");
      loadBusinesses();
    }
    
    setProcessing(false);
  };

  const handleSubmit = async () => {
    if (!selectedBusiness) return;
    
    if (decision === "approve") {
      await handlePublish();
    } else {
      await handleRevise();
    }
  };

  const openPreview = (business: BusinessWithOwner) => {
    setSelectedBusiness(business);
    setDecision("approve");
    setReviseComment("");
    
    // Initialize editing states
    const content = business.content_json as { description?: string } | null;
    setEditedDescription(content?.description || "");
    setEditedCategory(business.category || "");
    setEditedNewCategory((business.new_category as string) || "");
    setNewCategoryCreated(false); // Сбрасываем флаг при открытии новой визитки
    setCreatedCategoryId(null); // Сбрасываем ID категории
    setIsAddingCategory(false); // Сбрасываем флаг добавления
    setEditedCity(business.city_name || "");
    setEditedAddress(business.location || "");
    
    setPreviewOpen(true);
  };

  const getContentHtml = (business: BusinessWithOwner): string => {
    const content = business.content_json as { content?: string } | null;
    return content?.content || "";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Черновик</Badge>;
      case "moderation":
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">На модерации</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContentImage = (business: BusinessWithOwner) => {
    const content = business.content_json as { image?: string } | null;
    return content?.image || null;
  };

  const isCategoryOther = editedCategory === "__other__" || editedCategory.toLowerCase().includes("другие");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Модерация визиток</p>
              <p className="text-xs text-muted-foreground">Панель модератора</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadBusinesses} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Обновить
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Визитки на модерации ({businesses.length})
          </h2>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : businesses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Нет визиток на модерации</p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Фото</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead className="w-[100px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        {getContentImage(business) ? (
                          <img 
                            src={getContentImage(business)!} 
                            alt={business.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{business.ownerName || "—"}</p>
                          <p className="text-muted-foreground text-xs">{business.ownerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{business.category}</TableCell>
                      <TableCell>{business.city_name}</TableCell>
                      <TableCell>{getStatusBadge(business.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(business.created_at).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openPreview(business)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Смотреть
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Просмотр визитки</DialogTitle>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-4">
              {/* Logo Image */}
              {getContentImage(selectedBusiness) ? (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={getContentImage(selectedBusiness)!}
                    alt={selectedBusiness.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Name */}
              <div>
                <Label>Название</Label>
                <p className="text-lg font-semibold">{selectedBusiness.name}</p>
              </div>

              {/* Description */}
              <div>
                <Label>Описание</Label>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Описание визитки..."
                  rows={3}
                />
              </div>

              {/* Category */}
              <div>
                <Label>Категория</Label>
                <Select value={editedCategory} onValueChange={setEditedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Другая</SelectItem>
                  </SelectContent>
                </Select>
                {isCategoryOther && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Введите название новой категории..."
                      value={editedNewCategory}
                      onChange={(e) => setEditedNewCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleAddNewCategory}
                      disabled={isAddingCategory}
                      title="Добавить категорию"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* City */}
              <div>
                <Label>Город</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Город..."
                    value={editedCity}
                    onChange={(e) => setEditedCity(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label>Адрес</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Адрес..."
                    value={editedAddress}
                    onChange={(e) => setEditedAddress(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* HTML Content Preview */}
              {getContentHtml(selectedBusiness) && (
                <div className="border border-border rounded-lg p-4 bg-background">
                  <p className="text-xs text-muted-foreground mb-2">Превью контента</p>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: getContentHtml(selectedBusiness) }}
                  />
                </div>
              )}

              {/* Decision Radio */}
              <div className="border-t border-border pt-4 space-y-4">
                <RadioGroup 
                  value={decision} 
                  onValueChange={(val) => setDecision(val as "approve" | "revise")}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approve" id="approve" />
                    <Label htmlFor="approve" className="cursor-pointer">Одобрить</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="revise" id="revise" />
                    <Label htmlFor="revise" className="cursor-pointer">Доработать</Label>
                  </div>
                </RadioGroup>

                {/* Comment input for revise */}
                {decision === "revise" && (
                  <Input
                    placeholder="Комментарий для владельца..."
                    value={reviseComment}
                    onChange={(e) => setReviseComment(e.target.value)}
                  />
                )}

                {/* Submit button */}
                <Button 
                  onClick={handleSubmit}
                  disabled={processing || (decision === "revise" && !reviseComment.trim())}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {decision === "approve" ? "Опубликовать" : "Отправить на доработку"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ModeratorAdmin = () => {
  return (
    <RoleGuard allowedRoles={["moderator", "super_admin"]}>
      <ModeratorContent />
    </RoleGuard>
  );
};

export default ModeratorAdmin;
