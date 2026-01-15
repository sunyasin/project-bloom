import { useState, useEffect } from "react";
import { 
  Building2, 
  Eye,
  RefreshCw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BusinessWithOwner extends Business {
  ownerEmail?: string;
  ownerName?: string;
}

const ModeratorContent = () => {
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUserWithRole();
  const [businesses, setBusinesses] = useState<BusinessWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithOwner | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [decision, setDecision] = useState<"approve" | "revise">("approve");
  const [reviseComment, setReviseComment] = useState("");
  const [processing, setProcessing] = useState(false);

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

  useEffect(() => {
    loadBusinesses();
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

  const handlePublish = async (business: BusinessWithOwner) => {
    setProcessing(true);
    
    const { error } = await supabase
      .from("businesses")
      .update({ status: "published" })
      .eq("id", business.id);
    
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      // Send notification to owner
      if (business.owner_id) {
        await sendNotification(
          business.owner_id,
          `✅ Ваша визитка "${business.name}" успешно прошла модерацию и опубликована!`
        );
      }
      
      toast({ title: "Успешно", description: `Визитка "${business.name}" опубликована` });
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
    
    // Update status to draft (pending for revision)
    const { error } = await supabase
      .from("businesses")
      .update({ 
        status: "draft",
        content_json: {
          ...(selectedBusiness.content_json as object || {}),
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
      await handlePublish(selectedBusiness);
    } else {
      await handleRevise();
    }
  };

  const openPreview = (business: BusinessWithOwner) => {
    setSelectedBusiness(business);
    setDecision("approve");
    setReviseComment("");
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
                      <TableCell>{business.city}</TableCell>
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
              {/* Main Image */}
              {getContentImage(selectedBusiness) ? (
                <img 
                  src={getContentImage(selectedBusiness)!}
                  alt={selectedBusiness.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Name + Category on one line */}
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">{selectedBusiness.name}</h3>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{selectedBusiness.category || "Без категории"}</span>
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
                  Отправить
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
    <RoleGuard allowedRoles={["moderator"]}>
      <ModeratorContent />
    </RoleGuard>
  );
};

export default ModeratorAdmin;
