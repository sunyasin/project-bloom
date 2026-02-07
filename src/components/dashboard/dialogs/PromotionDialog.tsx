import { useState, useRef, DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import type { PromotionFormData } from "@/hooks/use-promotions";

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: PromotionFormData;
  businesses: { id: string; name: string; status: string }[];
  uploadError: string | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSave: () => Promise<void>;
  onFieldChange: (field: keyof PromotionFormData, value: string) => void;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PromotionDialog({
  open,
  onOpenChange,
  initialData,
  businesses,
  uploadError,
  isDragging,
  fileInputRef,
  onSave,
  onFieldChange,
  onImageUpload,
  onRemoveImage,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
}: PromotionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData.title ? "Редактирование акции" : "Создание акции"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload Zone */}
          <div className="space-y-2">
            <Label>Изображение акции</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {initialData.image_url ? (
                <div className="relative inline-block">
                  <img
                    src={initialData.image_url}
                    alt="Promotion"
                    className="w-full max-h-40 object-cover rounded-lg mx-auto"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Перетащите изображение или нажмите для выбора</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF до 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFileInputChange}
              />
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="promo-title">Название акции</Label>
            <Input
              id="promo-title"
              value={initialData.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="Скидка 20% на молочные продукты"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="promo-description">Описание</Label>
            <Textarea
              id="promo-description"
              value={initialData.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="Условия акции..."
              rows={3}
            />
          </div>

          {/* Discount & Valid Until */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-discount">Скидка</Label>
              <Input
                id="promo-discount"
                value={initialData.discount}
                onChange={(e) => onFieldChange("discount", e.target.value)}
                placeholder="20%"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-valid-until">Действует до</Label>
              <Input
                id="promo-valid-until"
                type="date"
                value={initialData.valid_until}
                onChange={(e) => onFieldChange("valid_until", e.target.value)}
              />
            </div>
          </div>

          {/* Business (визитка) */}
          <div className="space-y-2">
            <Label>Визитка (обязательно)</Label>
            <Select
              value={initialData.business_id}
              onValueChange={(value) => onFieldChange("business_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите визитку" />
              </SelectTrigger>
              <SelectContent>
                {businesses
                  .filter((biz) => biz.status === "published")
                  .map((biz) => (
                    <SelectItem key={biz.id} value={biz.id}>
                      {biz.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
