import { useState, useEffect } from "react";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import type { Tables } from "@/integrations/supabase/types";

// URL для Edge Function process-notifications
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-notifications`
  : "";

type News = Tables<"news">;

interface NewsFormData {
  title: string;
  content: string;
  image_url: string;
  is_event: boolean;
  event_date: string;
  is_published: boolean;
}

interface AdminNewsProps {
  onBack?: () => void;
}

const AdminNewsContent = ({ onBack }: AdminNewsProps) => {
  const { toast } = useToast();
  const { user } = useCurrentUserWithRole();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<NewsFormData>({
    title: "",
    content: "",
    image_url: "",
    is_event: false,
    event_date: "",
    is_published: true,
  });

  const loadNews = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading news:", error);
      toast({ title: "Ошибка", description: "Не удалось загрузить новости", variant: "destructive" });
    } else {
      setNews(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadNews();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      image_url: "",
      is_event: false,
      event_date: "",
      is_published: true,
    });
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: News) => {
    setFormData({
      title: item.title,
      content: item.content || "",
      image_url: item.image_url || "",
      is_event: item.is_event,
      event_date: item.event_date || "",
      is_published: item.is_published,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Ошибка", description: "Введите заголовок", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Ошибка", description: "Не авторизован", variant: "destructive" });
      return;
    }

    setProcessing(true);

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim() || null,
      image_url: formData.image_url.trim() || null,
      is_event: formData.is_event,
      event_date: formData.is_event && formData.event_date ? formData.event_date : null,
      is_published: formData.is_published,
      owner_id: user.id,
    };

    if (editingId) {
      // Update
      const { error } = await supabase
        .from("news")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Успешно", description: "Новость обновлена" });
        setDialogOpen(false);
        resetForm();
        loadNews();
      }
    } else {
      // Create
      const { error } = await supabase
        .from("news")
        .insert(payload);

      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Успешно", description: "Новость создана" });
        setDialogOpen(false);
        resetForm();
        loadNews();
        
        // Вызываем Edge Function для отправки уведомлений
        triggerNotifications();
      }
    }

    setProcessing(false);
  };

  // Функция вызова Edge Function для отправки уведомлений
  const triggerNotifications = async () => {
    console.log("[DEBUG] triggerNotifications called");
    
    if (!EDGE_FUNCTION_URL) {
      console.log("[DEBUG] Edge Function URL not configured");
      return;
    }
    
    console.log("[DEBUG] Edge Function URL:", EDGE_FUNCTION_URL);
    
    try {
      // Получаем токен из сессии
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      
      console.log("[DEBUG] Auth token present:", !!token);
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        },
      });
      
      console.log("[DEBUG] Response status:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("[DEBUG] Notifications sent successfully:", result);
      } else {
        const error = await response.text();
        console.error("[DEBUG] Failed to send notifications:", response.status, error);
      }
    } catch (error) {
      console.error("[DEBUG] Error sending notifications:", error);
    }
  };

  const handleDelete = async (item: News) => {
    if (!confirm(`Удалить "${item.title}"?`)) return;

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Удалено", description: "Новость удалена" });
      loadNews();
    }
  };

  const togglePublished = async (item: News) => {
    const { error } = await supabase
      .from("news")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      loadNews();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">Управление новостями</h2>
            <p className="text-sm text-muted-foreground">
              Всего: {news.length} новостей
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadNews} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Обновить
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {/* News Table */}
      <div className="bg-card border border-border rounded-lg">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Загрузка...</p>
        ) : news.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Нет новостей</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Фото</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата события</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-[150px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Newspaper className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>
                      {item.is_event ? (
                        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                          <Calendar className="h-3 w-3 mr-1" />
                          Событие
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Новость</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.event_date
                        ? new Date(item.event_date).toLocaleDateString("ru-RU")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublished(item)}
                        className={cn(
                          item.is_published
                            ? "text-green-600 hover:text-green-700"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item.is_published ? (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Опубликовано
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Черновик
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="text-destructive hover:text-destructive"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать новость" : "Добавить новость"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Введите заголовок"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Содержание</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Текст новости..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL изображения</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Это событие?</p>
                <p className="text-sm text-muted-foreground">
                  Если да, можно указать дату проведения
                </p>
              </div>
              <Switch
                checked={formData.is_event}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_event: checked }))}
              />
            </div>

            {formData.is_event && (
              <div className="space-y-2">
                <Label htmlFor="event_date">Дата события</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Опубликовать</p>
                <p className="text-sm text-muted-foreground">
                  Новость будет видна пользователям
                </p>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={processing}>
              {processing ? "Сохранение..." : editingId ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminNews = () => {
  return (
    <RoleGuard allowedRoles={["super_admin", "news_editor"]}>
      <AdminNewsContent />
    </RoleGuard>
  );
};

export default AdminNews;
