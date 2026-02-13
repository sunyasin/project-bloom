import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
}

interface BusinessCard {
  id: string;
  name: string;
}

interface DeleteBusinessCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessCardId: string;
  businessCardName: string;
  onConfirm: () => void;
}

export function DeleteBusinessCardDialog({
  open,
  onOpenChange,
  businessCardId,
  businessCardName,
  onConfirm,
}: DeleteBusinessCardDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [otherBusinessCards, setOtherBusinessCards] = useState<BusinessCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && businessCardId) {
      loadData();
    }
  }, [open, businessCardId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load products linked to this business card
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("business_card_id", businessCardId);

      if (productsError) throw productsError;

      // Load other business cards from the same producer
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", (await supabase.auth.getUser()).data.user?.id)
        .neq("id", businessCardId)
        .neq("status", "deleted");

      if (businessError) throw businessError;

      setProducts(productsData || []);
      setOtherBusinessCards(businessData || []);
      
      // Auto-select first available business card if exists
      if (businessData && businessData.length > 0) {
        setSelectedCardId(businessData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (products.length > 0 && !selectedCardId) {
      toast({
        title: "Ошибка",
        description: "Выберите визитку для переноса товаров",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      // Reassign products to selected business card
      if (products.length > 0 && selectedCardId) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ business_card_id: selectedCardId })
          .eq("business_card_id", businessCardId);

        if (updateError) throw updateError;
      }

      // Delete the business card
      onConfirm();
      
      toast({
        title: "Успешно",
        description: products.length > 0 
          ? `Визитка удалена, ${products.length} товаров перенесено`
          : "Визитка удалена",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting business card:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить визитку",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const hasProducts = products.length > 0;
  const hasOtherCards = otherBusinessCards.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Удаление визитки
          </DialogTitle>
          <DialogDescription>
            Вы собираетесь удалить визитку "{businessCardName}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-4 text-center text-muted-foreground">Загрузка...</div>
        ) : hasProducts ? (
          <div className="space-y-4">
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                С этой визиткой связаны товары: {products.map(p => p.name).join(", ")}
              </p>
            </div>

            {hasOtherCards ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Выберите другую визитку для них:
                </Label>
                <RadioGroup
                  value={selectedCardId}
                  onValueChange={setSelectedCardId}
                  className="space-y-2"
                >
                  {otherBusinessCards.map((card) => (
                    <div key={card.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={card.id} id={card.id} />
                      <Label htmlFor={card.id} className="cursor-pointer">
                        {card.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  У вас нет других визиток для переноса товаров. 
                  Товары временно потеряют привязку к визитке.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              С этой визиткой не связаны товары. Вы уверены, что хотите её удалить?
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={processing || (hasProducts && hasOtherCards && !selectedCardId)}
          >
            {processing ? "Удаление..." : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
