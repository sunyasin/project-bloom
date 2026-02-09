import { useState, useEffect, useRef, DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Map,
  ImageIcon,
  Upload,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";

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

interface ProfileFormData {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  city: string;
  address: string;
  gps_lat: string;
  gps_lng: string;
  logo_url: string;
}

const emptyFormData: ProfileFormData = {
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  city: "",
  address: "",
  gps_lat: "",
  gps_lng: "",
  logo_url: "",
};

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewUser?: boolean;
  onSaveSuccess?: () => void;
}

export const ProfileEditDialog = ({ 
  open, 
  onOpenChange, 
  isNewUser = false,
  onSaveSuccess 
}: ProfileEditDialogProps) => {
  const { toast } = useToast();
  const { user } = useCurrentUserWithRole();
  
  const [formData, setFormData] = useState<ProfileFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProducer = user?.roles?.some(r => ["moderator", "news_editor", "super_admin"].includes(r));
  const isClient = user?.roles?.includes("client");

  // Check if URL is a blob URL (temporary, should not be saved)
  const isBlobUrl = (url: string): boolean => {
    return url.startsWith('blob:');
  };

  // Load profile data when dialog opens
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !open) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      }

      if (data && !isNewUser) {
        setFormData({
          email: data.email || "",
          phone: data.phone || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          city: data.city || "",
          address: data.address || "",
          gps_lat: data.gps_lat?.toString() || "",
          gps_lng: data.gps_lng?.toString() || "",
          logo_url: data.logo_url || "",
        });
      } else {
        // For new users, start with empty form
        setFormData(emptyFormData);
      }
      setLoading(false);
    };

    if (open) {
      loadProfile();
    }
  }, [user, open, isNewUser]);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email обязателен";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Некорректный email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Телефон обязателен";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "Имя обязательно";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Фамилия обязательна";
    }

    // City and address required for client role
    if (isClient) {
      if (!formData.city.trim()) {
        newErrors.city = "Город/Село обязателен";
      }
      if (!formData.address.trim()) {
        newErrors.address = "Адрес обязателен";
      }
      // Check logo is uploaded (not a blob URL)
      if (!formData.logo_url.trim() || isBlobUrl(formData.logo_url)) {
        newErrors.logo_url = "Логотип обязателен";
      }
    }

    // For producers: logo, address, city and coordinates are required
    if (isProducer) {
      // Check logo is uploaded (not a blob URL)
      if (!formData.logo_url.trim() || isBlobUrl(formData.logo_url)) {
        newErrors.logo_url = "Логотип обязателен для производителя";
      }
      if (!formData.city.trim()) {
        newErrors.city = "Город/Село обязателен";
      }
      if (!formData.address.trim()) {
        newErrors.address = "Адрес обязателен для производителя";
      }
      if (!formData.gps_lat.trim() || !formData.gps_lng.trim()) {
        newErrors.gps_lat = "Координаты обязательны для производителя";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    // Check for blob URL before saving
    if (isBlobUrl(formData.logo_url)) {
      toast({
        title: "Ошибка изображения",
        description: "Изображение не загружено корректно. Пожалуйста, загрузите изображение заново.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const profileData = {
      user_id: user.id,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      city: formData.city || null,
      address: formData.address.trim() || null,
      gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
      gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
      logo_url: formData.logo_url.trim() || null,
    };

    // Use upsert to handle both new and existing profiles
    const { error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "user_id" });

    if (error) {
      console.error("Profile save error:", error);
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Профиль сохранён",
        description: "Данные успешно обновлены",
      });
      onOpenChange(false);
      onSaveSuccess?.();
    }

    setSaving(false);
  };

  // File upload handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    
    // Clear blob URL if exists
    if (formData.logo_url && isBlobUrl(formData.logo_url)) {
      updateField("logo_url", "");
    }
    
    setUploadError(null);
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Разрешены только изображения JPEG, PNG, WebP, GIF");
      return;
    }
    
    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("Размер файла не должен превышать 5MB");
      return;
    }
    
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        setUploadError("Ошибка загрузки изображения");
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      updateField("logo_url", publicUrl);
      setUploadError(null);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Ошибка загрузки файла");
    }
  };

  const handleRemoveLogo = () => {
    updateField("logo_url", "");
  };

  const handleOpenFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isNewUser && onOpenChange(value)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewUser ? "Заполните профиль" : "Редактирование профиля"}
          </DialogTitle>
          <DialogDescription>
            {isNewUser 
              ? "Добро пожаловать! Заполните обязательные поля для продолжения."
              : "Обновите ваши личные данные"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Загрузка...</div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Логотип / Аватар {(isProducer || isClient) && <span className="text-destructive">*</span>}
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : errors.logo_url
                      ? "border-destructive"
                      : "border-border hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleOpenFileInput}
              >
                {formData.logo_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.logo_url}
                      alt="Логотип"
                      className="w-24 h-24 rounded-full object-cover mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLogo();
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
                  onChange={handleFileInputChange}
                />
              </div>
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
              {errors.logo_url && (
                <p className="text-xs text-destructive">{errors.logo_url}</p>
              )}
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  Имя <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="first_name"
                    placeholder="Иван"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Фамилия <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Иванов"
                  value={formData.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Contact fields */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Телефон <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (900) 123-45-67"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* City select */}
            <div className="space-y-2">
              <Label htmlFor="city">
                Город/Село {(isClient || isProducer) && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={formData.city}
                onValueChange={(value) => updateField("city", value)}
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
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Адрес {(isClient || isProducer) && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="address"
                placeholder="Улица, дом"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address}</p>
              )}
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gps_lat" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Широта {isProducer && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="gps_lat"
                  type="number"
                  step="any"
                  placeholder="44.5628"
                  value={formData.gps_lat}
                  onChange={(e) => updateField("gps_lat", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gps_lng" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Долгота {isProducer && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="gps_lng"
                  type="number"
                  step="any"
                  placeholder="33.8565"
                  value={formData.gps_lng}
                  onChange={(e) => updateField("gps_lng", e.target.value)}
                />
              </div>
            </div>
            {errors.gps_lat && (
              <p className="text-xs text-destructive">{errors.gps_lat}</p>
            )}

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4">
              {!isNewUser && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
