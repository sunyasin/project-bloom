import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Archive, X, Handshake, Package } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExchangeItem {
  item_id: string;
  qty: number;
}

interface ProductInfo {
  id: string;
  name: string;
  price: number | null;
}

interface Exchange {
  id: number;
  creator: string;
  provider: string;
  type: string;
  status: string;
  buyer_items: ExchangeItem[];
  provider_items: ExchangeItem[];
  comment: string | null;
  created_at: string;
  creatorName?: string;
  providerName?: string;
  isCreator: boolean;
}

interface ExchangeRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string | null;
}

type ExchangeStatus = "finished" | "reject" | "ok_meeting";

const STATUS_LABELS: Record<string, string> = {
  created: "Новый",
  ok_meeting: "Встреча",
  finished: "Завершён",
  reject: "Отклонён",
};

const STATUS_COLORS: Record<string, string> = {
  created: "bg-blue-500/10 text-blue-500",
  ok_meeting: "bg-green-500/10 text-green-500",
  finished: "bg-muted text-muted-foreground",
  reject: "bg-destructive/10 text-destructive",
};

export function ExchangeRequestsDialog({
  open,
  onOpenChange,
  profileId,
}: ExchangeRequestsDialogProps) {
  const { toast } = useToast();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  
  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [actionType, setActionType] = useState<ExchangeStatus | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Archive confirmation
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveExchange, setArchiveExchange] = useState<Exchange | null>(null);

  const fetchExchanges = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("exchange")
        .select("*")
        .or(`creator.eq.${profileId},provider.eq.${profileId}`)
        .neq("status", "reject")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get all unique profile IDs
      const profileIds = new Set<string>();
      data?.forEach((ex) => {
        profileIds.add(ex.creator);
        profileIds.add(ex.provider);
      });

      // Fetch profile names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", Array.from(profileIds));

      const profileMap = new Map(
        profiles?.map((p) => [
          p.id,
          `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Пользователь",
        ])
      );

      // Collect all product IDs
      const productIds = new Set<string>();
      data?.forEach((ex) => {
        const buyerItems = (ex.buyer_items || []) as unknown as ExchangeItem[];
        const providerItems = (ex.provider_items || []) as unknown as ExchangeItem[];
        buyerItems.forEach((item) => productIds.add(item.item_id));
        providerItems.forEach((item) => productIds.add(item.item_id));
      });

      // Fetch products
      if (productIds.size > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, price")
          .in("id", Array.from(productIds));

        const productsMap: Record<string, ProductInfo> = {};
        productsData?.forEach((p) => {
          productsMap[p.id] = p;
        });
        setProducts(productsMap);
      }

      const mapped: Exchange[] = (data || []).map((ex) => ({
        ...ex,
        buyer_items: ((ex.buyer_items || []) as unknown as ExchangeItem[]),
        provider_items: ((ex.provider_items || []) as unknown as ExchangeItem[]),
        creatorName: profileMap.get(ex.creator) || "Пользователь",
        providerName: profileMap.get(ex.provider) || "Пользователь",
        isCreator: ex.creator === profileId,
      }));

      setExchanges(mapped);
    } catch (error) {
      console.error("Error fetching exchanges:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить запросы на обмен",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && profileId) {
      fetchExchanges();
    }
  }, [open, profileId]);

  const formatItems = (items: ExchangeItem[]) => {
    return items
      .map((item) => {
        const product = products[item.item_id];
        return product
          ? `${product.name} (${item.qty} шт)`
          : `Товар ${item.item_id.slice(0, 8)} (${item.qty} шт)`;
      })
      .join(", ");
  };

  const handleAction = (exchange: Exchange, action: ExchangeStatus) => {
    if (action === "finished") {
      setArchiveExchange(exchange);
      setArchiveConfirmOpen(true);
    } else {
      setSelectedExchange(exchange);
      setActionType(action);
      setActionMessage("");
      setActionDialogOpen(true);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveExchange) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("exchange")
        .update({ status: "finished" })
        .eq("id", archiveExchange.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Обмен перемещён в архив",
      });

      fetchExchanges();
    } catch (error) {
      console.error("Error updating exchange:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setArchiveConfirmOpen(false);
      setArchiveExchange(null);
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedExchange || !actionType) return;

    setSubmitting(true);
    try {
      // Update exchange status
      const { error: updateError } = await supabase
        .from("exchange")
        .update({ status: actionType })
        .eq("id", selectedExchange.id);

      if (updateError) throw updateError;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Send message to the other party
        const recipientUserId = selectedExchange.isCreator
          ? await getProfileUserId(selectedExchange.provider)
          : await getProfileUserId(selectedExchange.creator);

        if (recipientUserId) {
          const providerItemsList = formatItems(selectedExchange.provider_items);
          const buyerItemsList = formatItems(selectedExchange.buyer_items);

          const statusText =
            actionType === "reject"
              ? "❌ Отклонён"
              : "🤝 Назначена встреча";

          const messageText = `На ваш запрос обмена [${providerItemsList}] на [${buyerItemsList}] получен ответ: ${statusText}${
            actionMessage ? `\n\nСообщение: ${actionMessage}` : ""
          }`;

          await supabase.from("messages").insert({
            from_id: user.id,
            to_id: recipientUserId,
            message: messageText,
            type: "exchange" as const,
          });
        }
      }

      toast({
        title: "Успешно",
        description:
          actionType === "reject"
            ? "Запрос отклонён"
            : "Статус обновлён, сообщение отправлено",
      });

      setActionDialogOpen(false);
      fetchExchanges();
    } catch (error) {
      console.error("Error processing action:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить действие",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProfileUserId = async (profileId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .single();
    return data?.user_id || null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Запросы на обмен
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : exchanges.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет активных запросов на обмен
            </p>
          ) : (
            <div className="space-y-3">
              {exchanges.map((exchange) => (
                <div
                  key={exchange.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={STATUS_COLORS[exchange.status] || ""}
                          variant="secondary"
                        >
                          {STATUS_LABELS[exchange.status] || exchange.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(exchange.created_at).toLocaleDateString(
                            "ru-RU"
                          )}
                        </span>
                      </div>
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">От:</span>{" "}
                        {exchange.creatorName}
                        {exchange.isCreator && (
                          <span className="text-xs text-primary ml-1">
                            (вы)
                          </span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Кому:</span>{" "}
                        {exchange.providerName}
                        {!exchange.isCreator && (
                          <span className="text-xs text-primary ml-1">
                            (вы)
                          </span>
                        )}
                      </p>
                    </div>

                    {exchange.status === "created" && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAction(exchange, "ok_meeting")}
                          title="Назначить встречу"
                        >
                          <Handshake className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(exchange, "reject")}
                          title="Отклонить"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {(exchange.status === "ok_meeting" ||
                      exchange.status === "created") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleAction(exchange, "finished")}
                        title="В архив"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Запрошено:
                      </p>
                      <p className="text-foreground">
                        {formatItems(exchange.provider_items) || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Предложено:
                      </p>
                      <p className="text-foreground">
                        {formatItems(exchange.buyer_items) || "—"}
                      </p>
                    </div>
                  </div>

                  {exchange.comment && (
                    <p className="text-sm text-muted-foreground italic">
                      «{exchange.comment}»
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action dialog with message */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "reject"
                ? "Отклонить запрос"
                : "Назначить встречу"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-message">Сообщение (необязательно)</Label>
              <Textarea
                id="action-message"
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder={
                  actionType === "reject"
                    ? "Укажите причину отклонения..."
                    : "Укажите время и место встречи..."
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={submitting}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {actionType === "reject" ? "Отклонить" : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перенести в архив?</AlertDialogTitle>
            <AlertDialogDescription>
              Обмен будет отмечен как завершённый и перемещён в архив.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              В архив
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
