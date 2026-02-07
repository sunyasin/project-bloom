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
import { Upload, X, MapPin } from "lucide-react";
import type { ProfileFormData } from "../types/dashboard-types";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ProfileFormData;
  errors: Partial<Record<keyof ProfileFormData, string>>;
  isClient: boolean;
  onSave: () => Promise<void>;
  onFieldChange: (field: keyof ProfileFormData, value: string) => void;
  onAvatarUpload: (file: File) => void;
  onRemoveAvatar: () => void;
  isDragging: boolean;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CITIES = [
  "Соколиное",
  "Аромат",
  "Куйбышево",
  "Танковое",
  "Голубинка",
  "Нижняя Голубинка",
  "Поляна",
  "Солнечноселье",
  "Счастливое",
  "Новоульяновка",
];

export function EditProfileDialog({
  open,
  onOpenChange,
  initialData,
  errors,
  isClient,
  onSave,
  onFieldChange,
  onAvatarUpload,
  onRemoveAvatar,
  isDragging,
  uploadError,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
}: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование профиля</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar Upload Zone */}
          <div className="space-y-2">
            <Label>
              Логотип / Аватар {isClient && <span className="text-destructive">*</span>}
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : errors.avatar
                    ? "border-destructive"
                    : "border-border hover:border-primary/50"
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {initialData.avatar ? (
                <div className="relative inline-block">
                  <img
                    src={initialData.avatar}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAvatar();
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
            {errors.avatar && <p className="text-xs text-destructive">{errors.avatar}</p>}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Имя и Фамилия {isClient && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="name"
                value={initialData.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={initialData.email}
                onChange={(e) => onFieldChange("email", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Телефон {isClient && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="phone"
              value={initialData.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* City & Address */}
          <div className="space-y-2">
            <Label htmlFor="city">
              Город / село {isClient && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={initialData.city}
              onValueChange={(value) => onFieldChange("city", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите населённый пункт" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Адрес {isClient && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="address"
              value={initialData.address}
              onChange={(e) => onFieldChange("address", e.target.value)}
              placeholder="ул. Фермерская, д. 15"
              rows={2}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Широта
              </Label>
              <Input
                id="lat"
                value={initialData.lat}
                onChange={(e) => onFieldChange("lat", e.target.value)}
                placeholder="55.123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Долгота
              </Label>
              <Input
                id="lng"
                value={initialData.lng}
                onChange={(e) => onFieldChange("lng", e.target.value)}
                placeholder="38.123456"
              />
            </div>
          </div>

          {/* Social Networks */}
          <div className="space-y-2">
            <Label>Социальные сети</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Telegram</span>
                <Input
                  value={initialData.telegram}
                  onChange={(e) => onFieldChange("telegram", e.target.value)}
                  placeholder="@username"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">VK</span>
                <Input
                  value={initialData.vk}
                  onChange={(e) => onFieldChange("vk", e.target.value)}
                  placeholder="https://vk.com/..."
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Instagram</span>
                <Input
                  value={initialData.instagram}
                  onChange={(e) => onFieldChange("instagram", e.target.value)}
                  placeholder="@username"
                />
              </div>
            </div>
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
