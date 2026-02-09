import { useState, useRef, DragEvent, useEffect } from "react";
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
import { Upload, X, MapPin, Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileFormData } from "../types/dashboard-types";

interface City {
  id: number;
  name: string;
  type: string;
  region_id: number | null;
}

interface Region {
  id: number;
  country: string;
  republic: string | null;
  oblast: string | null;
  district: string | null;
}

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
  // Region and custom city props
  selectedRegionId: number | null;
  showCustomCity: boolean;
  customCityName: string;
  customCityType: string;
  onCustomCityNameChange: (value: string) => void;
  onCustomCityTypeChange: (value: string) => void;
  onShowCustomCityChange: (value: boolean) => void;
  onSelectedRegionIdChange: (value: number | null) => void;
  onRefreshCities: () => void;
  cities?: {id: number, name: string, type: string, region_id: number | null}[];
}

// Get region display text
const getRegionText = (region: Region): string => {
  const parts = [
    region.country,
    region.republic,
    region.oblast,
    region.district,
  ].filter(Boolean);
  return parts.join(", ");
};

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
  selectedRegionId,
  showCustomCity,
  customCityName,
  customCityType,
  onCustomCityNameChange,
  onCustomCityTypeChange,
  onShowCustomCityChange,
  onSelectedRegionIdChange,
  onRefreshCities,
  cities,
}: EditProfileDialogProps) {
  const [regions, setRegions] = useState<Region[]>([]);

  // Load regions when dialog opens - use local state for initial load
  useEffect(() => {
    const loadRegions = async () => {
      const { data } = await (supabase as any)
        .from("region")
        .select("*")
        .order("country, republic, district");
      
      if (data) {
        setRegions(data);
        // Set initial region from props or default to first
        if (!selectedRegionId && data.length > 0) {
          onSelectedRegionIdChange(data[0].id);
        }
      }
    };

    if (open) {
      loadRegions();
    }
  }, [open]);

  // Load cities for selected region
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedRegionId) {
        setCities([]);
        return;
      }

      const { data } = await (supabase as any)
        .from("city")
        .select("*")
        .eq("region_id", selectedRegionId)
        .order("name");
      
      if (data) {
        setCities(data);
      }
    };

    loadCities();
  }, [selectedRegionId]);

  // Handle city selection
  const handleCityChange = (value: string) => {
    if (value === "-1") {
      onShowCustomCityChange(true);
      onFieldChange("city_id", "-1");
    } else {
      onShowCustomCityChange(false);
      onFieldChange("city_id", value);
    }
  };

  // Handle region change
  const handleRegionChange = (value: string) => {
    onSelectedRegionIdChange(value ? Number(value) : null);
    // Reset city selection when region changes
    onFieldChange("city_id", "");
    onShowCustomCityChange(false);
  };

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

          {/* Region select */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Регион {isClient && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={selectedRegionId?.toString() || ""}
              onValueChange={handleRegionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите регион" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id.toString()}>
                    {getRegionText(region)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City & Address */}
          {selectedRegionId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Город / село {isClient && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={initialData.city_id?.toString() || ""}
                onValueChange={handleCityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите населённый пункт" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name} ({city.type})
                    </SelectItem>
                  ))}
                  <SelectItem value="-1">Другой...</SelectItem>
                </SelectContent>
              </Select>
              {errors.city_id && <p className="text-xs text-destructive">{errors.city_id}</p>}
            </div>
          )}

          {/* Custom city fields */}
          {showCustomCity && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Новый населённый пункт
              </Label>
              <Select
                value={customCityType}
                onValueChange={onCustomCityTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Тип населённого пункта" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="село">село</SelectItem>
                  <SelectItem value="поселок">поселок</SelectItem>
                  <SelectItem value="деревня">деревня</SelectItem>
                  <SelectItem value="город">город</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Название населённого пункта"
                value={customCityName}
                onChange={(e) => onCustomCityNameChange(e.target.value)}
              />
            </div>
          )}

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
