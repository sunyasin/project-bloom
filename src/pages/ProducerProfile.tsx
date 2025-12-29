import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  User, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  Link as LinkIcon,
  Plus,
  X,
  Save,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProducerProfileData {
  avatar: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  telegram: string;
  social_links: string[];
  extra_contacts: string;
  latitude: string;
  longitude: string;
}

const initialData: ProducerProfileData = {
  avatar: "",
  name: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  telegram: "",
  social_links: [""],
  extra_contacts: "{}",
  latitude: "",
  longitude: "",
};

const ProducerProfile = () => {
  const [formData, setFormData] = useState<ProducerProfileData>(initialData);

  const updateField = <K extends keyof ProducerProfileData>(
    field: K,
    value: ProducerProfileData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.social_links];
    newLinks[index] = value;
    updateField("social_links", newLinks);
  };

  const addSocialLink = () => {
    updateField("social_links", [...formData.social_links, ""]);
  };

  const removeSocialLink = (index: number) => {
    const newLinks = formData.social_links.filter((_, i) => i !== index);
    updateField("social_links", newLinks.length ? newLinks : [""]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse extra_contacts as JSON for logging
    let parsedExtraContacts = {};
    try {
      parsedExtraContacts = JSON.parse(formData.extra_contacts);
    } catch {
      parsedExtraContacts = { raw: formData.extra_contacts };
    }

    const dataToSave = {
      ...formData,
      social_links: formData.social_links.filter((link) => link.trim() !== ""),
      extra_contacts: parsedExtraContacts,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    console.log("Producer profile data:", dataToSave);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Профиль производителя</h1>
          <p className="text-muted-foreground mt-1">
            Заполните информацию о вашем бизнесе
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="content-card">
            <h2 className="section-title flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Аватар
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="avatar">URL изображения</Label>
                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar}
                  onChange={(e) => updateField("avatar", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="content-card">
            <h2 className="section-title flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Основная информация
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  placeholder="Название вашего бизнеса"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Расскажите о вашем бизнесе, продукции, истории..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="content-card">
            <h2 className="section-title flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Адрес и геолокация
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  placeholder="Область, район, населённый пункт"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude" className="flex items-center gap-1">
                    <Map className="h-3 w-3" />
                    Широта
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="55.7558"
                    value={formData.latitude}
                    onChange={(e) => updateField("latitude", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="flex items-center gap-1">
                    <Map className="h-3 w-3" />
                    Долгота
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="37.6173"
                    value={formData.longitude}
                    onChange={(e) => updateField("longitude", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="content-card">
            <h2 className="section-title flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Контакты
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Телефон</Label>
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
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
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
              </div>
              <div>
                <Label htmlFor="telegram">Telegram</Label>
                <div className="relative">
                  <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telegram"
                    placeholder="@username"
                    value={formData.telegram}
                    onChange={(e) => updateField("telegram", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="content-card">
            <h2 className="section-title flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Социальные сети
            </h2>
            <div className="space-y-3">
              {formData.social_links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://vk.com/your_page"
                      value={link}
                      onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить ссылку
              </Button>
            </div>
          </div>

          {/* Extra Contacts (JSON) */}
          <div className="content-card">
            <h2 className="section-title">Дополнительные контакты (JSON)</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Введите дополнительные контакты в формате JSON
            </p>
            <Textarea
              placeholder='{"whatsapp": "+79001234567", "viber": "+79001234567"}'
              value={formData.extra_contacts}
              onChange={(e) => updateField("extra_contacts", e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline">
              Отмена
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ProducerProfile;
