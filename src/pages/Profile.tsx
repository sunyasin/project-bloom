import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Save,
  Map,
  ImageIcon,
  Pencil
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

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: userLoading } = useCurrentUserWithRole();
  
  const isNewUser = searchParams.get("new") === "true";
  const [dialogOpen, setDialogOpen] = useState(isNewUser);
  const [formData, setFormData] = useState<ProfileFormData>(emptyFormData);
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  const isProducer = user?.role === "moderator" || user?.role === "news_editor" || user?.role === "super_admin";

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/auth");
    }
  }, [user, userLoading, navigate]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      }

      if (data) {
        const loaded: ProfileFormData = {
          email: data.email || "",
          phone: data.phone || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          city: data.city || "",
          address: data.address || "",
          gps_lat: data.gps_lat?.toString() || "",
          gps_lng: data.gps_lng?.toString() || "",
          logo_url: data.logo_url || "",
        };
        setProfileData(loaded);
        setFormData(loaded);
      }
      setLoading(false);
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  // Show dialog for new users
  useEffect(() => {
    if (isNewUser && !loading) {
      setDialogOpen(true);
    }
  }, [isNewUser, loading]);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
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

    // For producers: logo, address and coordinates are required
    if (isProducer) {
      if (!formData.logo_url.trim()) {
        newErrors.logo_url = "Логотип обязателен для производителя";
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

    setSaving(true);

    const updateData = {
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

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfileData(formData);
      setDialogOpen(false);
      toast({
        title: "Профиль сохранён",
        description: "Данные успешно обновлены",
      });
      
      // Remove ?new=true from URL
      if (isNewUser) {
        navigate("/profile", { replace: true });
      }
    }

    setSaving(false);
  };

  const openEditDialog = () => {
    setFormData(profileData || emptyFormData);
    setErrors({});
    setDialogOpen(true);
  };

  if (userLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Загрузка...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Мой профиль</h1>
            <p className="text-muted-foreground mt-1">
              Ваши личные данные
            </p>
          </div>
          <Button onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        </div>

        {/* Profile Display */}
        <div className="content-card space-y-4">
          {profileData?.logo_url && (
            <div className="flex justify-center">
              <img
                src={profileData.logo_url}
                alt="Logo"
                className="w-24 h-24 rounded-xl object-cover"
              />
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Имя</Label>
              <p className="font-medium">{profileData?.first_name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Фамилия</Label>
              <p className="font-medium">{profileData?.last_name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{profileData?.email || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Телефон</Label>
              <p className="font-medium">{profileData?.phone || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Город/Село</Label>
              <p className="font-medium">{profileData?.city || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Адрес</Label>
              <p className="font-medium">{profileData?.address || "—"}</p>
            </div>
            {(profileData?.gps_lat || profileData?.gps_lng) && (
              <div className="md:col-span-2">
                <Label className="text-muted-foreground text-xs">Координаты</Label>
                <p className="font-medium">
                  {profileData?.gps_lat}, {profileData?.gps_lng}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !isNewUser && setDialogOpen(open)}>
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

            <div className="space-y-4 mt-4">
              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logo_url" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Логотип (URL) {isProducer && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="logo_url"
                  type="url"
                  placeholder="https://example.com/logo.jpg"
                  value={formData.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                />
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
                <Label htmlFor="city">Город/Село</Label>
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
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Адрес {isProducer && <span className="text-destructive">*</span>}
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
                    onClick={() => setDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Profile;
