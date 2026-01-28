import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, ShoppingCart, MessageCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface ProductForDialog {
  id: string;
  name: string;
  image: string;
  price: string;
  rawPrice: number;
  coinPrice: number | null;
  saleType: string;
  description: string;
  content: string;
  unit: string;
  galleryUrls: string[];
}

export interface ProductDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductForDialog | null;
  businessId: string;
  businessName: string;
  ownerId: string;
  currentUser: User | null;
  currentUserName?: string;
  orderPhone?: string;
}

export const ProductDetailsDialog = ({
  open,
  onOpenChange,
  product,
  businessId,
  businessName,
  ownerId,
  currentUser,
  currentUserName = "",
  orderPhone = "",
}: ProductDetailsDialogProps) => {
  const { toast } = useToast();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState(orderPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");

  if (!product) return null;

  const allImages = [product.image, ...product.galleryUrls].filter(Boolean);
  const hasBarter = product.saleType === "barter_goods" || product.saleType === "barter_coin";

  const handleOrder = async () => {
    if (!currentUser) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в аккаунт для заказа",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const message = `Заказ от ${currentUserName || "Аноним"}:
Товар: ${product.name} (${quantity} ${product.unit})
Цена: ${product.rawPrice * quantity} ₽
Телефон: ${phone || "не указан"}`;

    const { error } = await supabase.from("messages").insert({
      from_id: currentUser.id,
      to_id: ownerId,
      message,
      type: "chat" as const,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заказ",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Заказ отправлен",
      description: "Производитель получит ваше сообщение",
    });
    onOpenChange(false);
  };

  const handleSendQuestion = async () => {
    if (!currentUser) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите для отправки сообщения",
        variant: "destructive",
      });
      return;
    }

    if (!questionText.trim()) {
      toast({
        title: "Введите вопрос",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const message = `Вопрос о товаре "${product.name}" от ${currentUserName || "Аноним"}:
${questionText}`;

    const { error } = await supabase.from("messages").insert({
      from_id: currentUser.id,
      to_id: ownerId,
      message,
      type: "chat" as const,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить вопрос",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Вопрос отправлен",
      description: "Производитель получит ваше сообщение",
    });
    setQuestionDialogOpen(false);
    setQuestionText("");
  };

  return (
    <>
      <Dialog open={open && !questionDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              Производитель:{" "}
              <Link
                to={`/business/${businessId}`}
                className="text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {businessName}
              </Link>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Gallery */}
            {allImages.length > 0 && (
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={allImages[galleryIndex] || allImages[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setGalleryIndex((prev) =>
                          prev === 0 ? allImages.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        setGalleryIndex((prev) =>
                          prev === allImages.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGalleryIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === galleryIndex
                              ? "bg-primary"
                              : "bg-background/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === galleryIndex
                            ? "border-primary"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-primary">{product.price}</p>
              {product.coinPrice && (
                <p className="text-sm text-muted-foreground">
                  Бартер: {product.coinPrice} монет
                </p>
              )}
            </div>

            {/* Description */}
            {(product.description || product.content) && (
              <div className="space-y-2">
                <h4 className="font-medium">Описание</h4>
                {product.description && (
                  <p className="text-sm text-muted-foreground">
                    {product.description}
                  </p>
                )}
                {product.content && (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: product.content }}
                  />
                )}
              </div>
            )}

            {/* Quantity input */}
            <div className="flex items-center gap-4">
              <Label htmlFor="quantity">Количество:</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {product.unit}
              </span>
            </div>

            {/* Phone for order */}
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон для связи</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(true)}
              disabled={!currentUser}
              title={!currentUser ? "Войдите для отправки вопроса" : undefined}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Задать вопрос
            </Button>

            {hasBarter && (
              <Button
                variant="outline"
                asChild
                onClick={() => onOpenChange(false)}
              >
                <Link to={`/business/${businessId}`}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Бартер
                </Link>
              </Button>
            )}

            <Button
              onClick={handleOrder}
              disabled={isSubmitting || !currentUser}
              title={!currentUser ? "Войдите для заказа" : undefined}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isSubmitting ? "Отправка..." : "Заказать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Задать вопрос о товаре</DialogTitle>
            <DialogDescription>
              Товар: {product.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Введите ваш вопрос..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleSendQuestion} disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
