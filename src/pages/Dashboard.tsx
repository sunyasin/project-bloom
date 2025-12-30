import { MainLayout } from "@/components/layout/MainLayout";
import { User, Tag, Bell, Newspaper, Package, Plus, Pencil, Upload, X, MapPin, Percent, Trash2, Calendar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, DragEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// ============= Mock API functions =============

// Имитация данных профиля клиента
const mockProfileData = {
  id: "1",
  name: "Иван Петров",
  email: "ivan@example.com",
  phone: "+7 (999) 123-45-67",
  address: "Московская область, г. Коломна, ул. Фермерская, д. 15",
  coordinates: { lat: "55.079201", lng: "38.778389" },
  avatar: "",
  telegram: "@ivan_petrov",
  vk: "https://vk.com/ivan_petrov",
  instagram: "",
};

// Имитация получения профиля (GET /api/profile/:id)
const mockAPIGetProfile = async (id: string) => {
  console.log(`[mockAPI] GET /api/profile/${id}`);
  return { ...mockProfileData };
};

// Имитация сохранения профиля (PUT /api/profile/:id)
const mockAPISaveProfile = async (id: string, data: typeof mockProfileData) => {
  console.log(`[mockAPI] PUT /api/profile/${id}`, data);
  return { success: true, data };
};

// Имитация загрузки аватара (POST /api/profile/:id/avatar)
const mockAPIUploadAvatar = async (id: string, file: File) => {
  console.log(`[mockAPI] POST /api/profile/${id}/avatar`, { fileName: file.name, size: file.size });
  // Возвращаем локальный URL для превью
  return { success: true, url: URL.createObjectURL(file) };
};

// Валидация изображения
const mockAPIValidateImage = (file: File) => {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: "Допустимые форматы: JPEG, PNG, WebP, GIF" };
  }
  if (file.size > maxSize) {
    return { valid: false, error: "Максимальный размер файла: 5MB" };
  }
  return { valid: true, error: null };
};

// ============= End Mock API =============

// Mock user data
const mockUser = {
  name: "Иван Петров",
  email: "ivan@example.com",
  role: "client",
  businessCount: 2,
};

// Mock business cards (визитки)
const mockBusinessCards = [
  { id: "1", name: "Фермерское хозяйство", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop" },
  { id: "2", name: "Молочная ферма", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop" },
  { id: "3", name: "Пасека Медовая", image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200&h=200&fit=crop" },
];

// Mock products (товары)
const mockProducts = [
  { id: "1", name: "Молоко свежее", price: 120, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
  { id: "2", name: "Сыр домашний", price: 450, image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
  { id: "3", name: "Мёд липовый", price: 800, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
  { id: "4", name: "Яйца куриные", price: 150, image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop" },
  { id: "5", name: "Творог", price: 280, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop" },
  { id: "6", name: "Сметана", price: 180, image: "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?w=200&h=200&fit=crop" },
];

// ============= Mock API для акций =============

// Данные акций
const mockPromotions = [
  { id: "1", title: "Скидка на молоко 20%", description: "При покупке от 5 литров", discount: "20%", validUntil: "2025-01-15", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
  { id: "2", title: "2+1 на сыр", description: "Третья упаковка в подарок", discount: "33%", validUntil: "2025-01-31", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
  { id: "3", title: "Мёд со скидкой", description: "Специальное предложение на липовый мёд", discount: "15%", validUntil: "2025-02-28", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
];

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  image: string;
}

// Имитация получения списка акций (GET /api/promotions)
const mockAPIGetPromotions = async () => {
  console.log("[mockAPI] GET /api/promotions");
  return [...mockPromotions];
};

// Имитация получения одной акции (GET /api/promotions/:id)
const mockAPIGetPromotion = async (id: string): Promise<Promotion | null> => {
  console.log(`[mockAPI] GET /api/promotions/${id}`);
  return mockPromotions.find(p => p.id === id) || null;
};

// Имитация сохранения акции (POST/PUT /api/promotions/:id)
const mockAPISavePromotion = async (data: Promotion) => {
  console.log(`[mockAPI] ${data.id === "new" ? "POST" : "PUT"} /api/promotions/${data.id}`, data);
  return { success: true, data: { ...data, id: data.id === "new" ? String(Date.now()) : data.id } };
};

// Имитация загрузки изображения акции (POST /api/promotions/:id/image)
const mockAPIUploadPromotionImage = async (id: string, file: File) => {
  console.log(`[mockAPI] POST /api/promotions/${id}/image`, { fileName: file.name, size: file.size });
  return { success: true, url: URL.createObjectURL(file) };
};

// ============= End Mock API для акций =============

// ============= Mock API для новостей =============

// Данные новостей
const mockNews = [
  { id: "1", title: "Открытие нового филиала", content: "Рады сообщить об открытии нового филиала в Москве", date: "2024-12-28", isEvent: false },
  { id: "2", title: "Праздничная ярмарка", content: "Приглашаем на праздничную ярмарку 15 января", date: "2024-12-25", isEvent: true },
  { id: "3", title: "Расширение ассортимента", content: "Добавили новые молочные продукты", date: "2024-12-20", isEvent: false },
  { id: "4", title: "Мастер-класс по сыроварению", content: "Проводим мастер-класс для всех желающих", date: "2024-12-18", isEvent: true },
  { id: "5", title: "Скидки на Новый год", content: "Специальные предложения к праздникам", date: "2024-12-15", isEvent: false },
  { id: "6", title: "Обновление цен", content: "Информация об обновлении прайс-листа", date: "2024-12-10", isEvent: false },
  { id: "7", title: "Дегустация продукции", content: "Приглашаем на дегустацию в нашем магазине", date: "2024-12-05", isEvent: true },
];

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isEvent: boolean;
}

// Имитация получения списка новостей (GET /api/news)
const mockAPIGetNews = async () => {
  console.log("[mockAPI] GET /api/news");
  return [...mockNews];
};

// Имитация получения одной новости (GET /api/news/:id)
const mockAPIGetNewsItem = async (id: string): Promise<NewsItem | null> => {
  console.log(`[mockAPI] GET /api/news/${id}`);
  return mockNews.find(n => n.id === id) || null;
};

// Имитация сохранения новости (POST/PUT /api/news/:id)
const mockAPISaveNews = async (data: NewsItem) => {
  console.log(`[mockAPI] ${data.id === "new" ? "POST" : "PUT"} /api/news/${data.id}`, data);
  return { success: true, data: { ...data, id: data.id === "new" ? String(Date.now()) : data.id } };
};

// Имитация удаления новости (DELETE /api/news/:id)
const mockAPIDeleteNews = async (id: string) => {
  console.log(`[mockAPI] DELETE /api/news/${id}`);
  return { success: true };
};

// ============= End Mock API для новостей =============

const dashboardLinks = [
  { label: "Акции", href: "/dashboard/promotions", icon: Tag, count: 3 },
  { label: "Сообщения", href: "/dashboard/messages", icon: Bell, count: 5 },
  { label: "Новости", href: "/dashboard/news", icon: Newspaper },
];

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  lat: string;
  lng: string;
  avatar: string;
  telegram: string;
  vk: string;
  instagram: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [mainCardId, setMainCardId] = useState<string | null>("1");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Promotion editing state
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [promotionDragging, setPromotionDragging] = useState(false);
  const [promotionUploadError, setPromotionUploadError] = useState<string | null>(null);
  const promotionFileInputRef = useRef<HTMLInputElement>(null);
  const [promotionFormData, setPromotionFormData] = useState<Promotion>({
    id: "new",
    title: "",
    description: "",
    discount: "",
    validUntil: "",
    image: "",
  });
  
  // News editing state
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [newsFormData, setNewsFormData] = useState<NewsItem>({
    id: "new",
    title: "",
    content: "",
    date: "",
    isEvent: false,
  });
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: mockProfileData.name,
    email: mockProfileData.email,
    phone: mockProfileData.phone,
    address: mockProfileData.address,
    lat: mockProfileData.coordinates.lat,
    lng: mockProfileData.coordinates.lng,
    avatar: mockProfileData.avatar,
    telegram: mockProfileData.telegram,
    vk: mockProfileData.vk,
    instagram: mockProfileData.instagram,
  });

  const handleMainCardChange = (cardId: string, checked: boolean) => {
    setMainCardId(checked ? cardId : null);
  };

  const handleOpenEditDialog = async () => {
    // Загружаем данные профиля при открытии диалога
    const profile = await mockAPIGetProfile("1");
    setFormData({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      lat: profile.coordinates.lat,
      lng: profile.coordinates.lng,
      avatar: profile.avatar,
      telegram: profile.telegram,
      vk: profile.vk,
      instagram: profile.instagram,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    const profileData = {
      id: "1",
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      coordinates: { lat: formData.lat, lng: formData.lng },
      avatar: formData.avatar,
      telegram: formData.telegram,
      vk: formData.vk,
      instagram: formData.instagram,
    };
    await mockAPISaveProfile("1", profileData);
    setIsEditDialogOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    const validation = mockAPIValidateImage(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }
    
    const result = await mockAPIUploadAvatar("1", file);
    if (result.success) {
      setFormData(prev => ({ ...prev, avatar: result.url }));
    }
  };

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

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: "" }));
  };

  // ============= Promotion handlers =============
  
  const handleOpenPromotionDialog = async (promotionId?: string) => {
    if (promotionId) {
      const promotion = await mockAPIGetPromotion(promotionId);
      if (promotion) {
        setPromotionFormData(promotion);
      }
    } else {
      setPromotionFormData({
        id: "new",
        title: "",
        description: "",
        discount: "",
        validUntil: "",
        image: "",
      });
    }
    setPromotionUploadError(null);
    setIsPromotionDialogOpen(true);
  };

  const handleSavePromotion = async () => {
    await mockAPISavePromotion(promotionFormData);
    setIsPromotionDialogOpen(false);
  };

  const handlePromotionFileUpload = async (file: File) => {
    setPromotionUploadError(null);
    const validation = mockAPIValidateImage(file);
    if (!validation.valid) {
      setPromotionUploadError(validation.error);
      return;
    }
    
    const result = await mockAPIUploadPromotionImage(promotionFormData.id, file);
    if (result.success) {
      setPromotionFormData(prev => ({ ...prev, image: result.url }));
    }
  };

  const handlePromotionDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPromotionDragging(true);
  };

  const handlePromotionDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPromotionDragging(false);
  };

  const handlePromotionDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPromotionDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePromotionFileUpload(files[0]);
    }
  };

  const handlePromotionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handlePromotionFileUpload(files[0]);
    }
  };

  const handleRemovePromotionImage = () => {
    setPromotionFormData(prev => ({ ...prev, image: "" }));
  };

  // ============= News handlers =============
  
  const handleOpenNewsDialog = async (newsId?: string) => {
    if (newsId) {
      const news = await mockAPIGetNewsItem(newsId);
      if (news) {
        setNewsFormData(news);
      }
    } else {
      setNewsFormData({
        id: "new",
        title: "",
        content: "",
        date: new Date().toISOString().split("T")[0],
        isEvent: false,
      });
    }
    setIsNewsDialogOpen(true);
  };

  const handleSaveNews = async () => {
    await mockAPISaveNews(newsFormData);
    setIsNewsDialogOpen(false);
  };

  const handleDeleteNews = async (id: string) => {
    await mockAPIDeleteNews(id);
    // В реальном приложении здесь был бы рефетч данных
    console.log(`[UI] News ${id} deleted, would refetch list`);
  };

  const displayedNews = showAllNews ? mockNews : mockNews.slice(0, 5);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* User Header */}
        <div className="content-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {formData.avatar ? (
                <img src={formData.avatar} alt={formData.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{formData.name}</h1>
              <p className="text-muted-foreground">{formData.email}</p>
              <span className="inline-block mt-1 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                Клиент
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
              <Pencil className="h-4 w-4 mr-1" />
              Редактировать
            </Button>
          </div>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактирование профиля</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Avatar Upload Zone */}
              <div className="space-y-2">
                <Label>Логотип / Аватар</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.avatar ? (
                    <div className="relative inline-block">
                      <img src={formData.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover mx-auto" />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Перетащите изображение или нажмите для выбора
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, WebP, GIF до 5MB
                      </p>
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
                {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              {/* Address & Coordinates */}
              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Полный адрес"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Широта
                  </Label>
                  <Input
                    id="lat"
                    value={formData.lat}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="55.123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Долгота
                  </Label>
                  <Input
                    id="lng"
                    value={formData.lng}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: e.target.value }))}
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
                      value={formData.telegram}
                      onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-20">VK</span>
                    <Input
                      value={formData.vk}
                      onChange={(e) => setFormData(prev => ({ ...prev, vk: e.target.value }))}
                      placeholder="https://vk.com/..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-20">Instagram</span>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveProfile}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Business Cards (Визитки) */}
        <div>
          <h2 className="section-title">Мои визитки</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <TooltipProvider>
              {mockBusinessCards.map((card) => (
                <div key={card.id} className="flex flex-col">
                  <button
                    onClick={() => navigate(`/dashboard/business-card/${card.id}`)}
                    className={`content-card hover:border-primary/30 transition-all hover:shadow-md group p-3 text-left ${
                      mainCardId === card.id ? "ring-2 ring-primary border-primary" : ""
                    }`}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground text-center truncate">
                      {card.name}
                    </p>
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer justify-center">
                        <Checkbox
                          checked={mainCardId === card.id}
                          onCheckedChange={(checked) => handleMainCardChange(card.id, checked === true)}
                        />
                        <span className="text-xs text-muted-foreground">главная</span>
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отображать эту визитку в моей карточке</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </TooltipProvider>
            {/* Create new business card */}
            <button
              onClick={() => navigate("/dashboard/business-card/new")}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Создать</p>
            </button>
          </div>
        </div>

        {/* Products (Товары) */}
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Package className="h-5 w-5" />
            Товары
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => navigate(`/dashboard/product/${product.id}`)}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-sm text-primary font-semibold">{product.price} ₽</p>
              </button>
            ))}
            {/* Create new product */}
            <button
              onClick={() => navigate("/dashboard/product/new")}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Создать</p>
            </button>
          </div>
        </div>

        {/* Promotions (Акции) */}
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Акции
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockPromotions.map((promotion) => (
              <button
                key={promotion.id}
                onClick={() => handleOpenPromotionDialog(promotion.id)}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                  <img
                    src={promotion.image}
                    alt={promotion.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-foreground truncate">{promotion.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{promotion.discount}</span>
                  <span className="text-xs text-muted-foreground">до {promotion.validUntil}</span>
                </div>
              </button>
            ))}
            {/* Create new promotion */}
            <button
              onClick={() => handleOpenPromotionDialog()}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Создать</p>
            </button>
          </div>
        </div>

        {/* Promotion Edit Dialog */}
        <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{promotionFormData.id === "new" ? "Создание акции" : "Редактирование акции"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Image Upload Zone */}
              <div className="space-y-2">
                <Label>Изображение акции</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    promotionDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={handlePromotionDragOver}
                  onDragLeave={handlePromotionDragLeave}
                  onDrop={handlePromotionDrop}
                  onClick={() => promotionFileInputRef.current?.click()}
                >
                  {promotionFormData.image ? (
                    <div className="relative inline-block">
                      <img src={promotionFormData.image} alt="Promotion" className="w-full max-h-40 object-cover rounded-lg mx-auto" />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        onClick={(e) => { e.stopPropagation(); handleRemovePromotionImage(); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Перетащите изображение или нажмите для выбора
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, WebP, GIF до 5MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={promotionFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePromotionFileInputChange}
                  />
                </div>
                {promotionUploadError && <p className="text-sm text-destructive">{promotionUploadError}</p>}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="promo-title">Название акции</Label>
                <Input
                  id="promo-title"
                  value={promotionFormData.title}
                  onChange={(e) => setPromotionFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Скидка 20% на молочные продукты"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="promo-description">Описание</Label>
                <Textarea
                  id="promo-description"
                  value={promotionFormData.description}
                  onChange={(e) => setPromotionFormData(prev => ({ ...prev, description: e.target.value }))}
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
                    value={promotionFormData.discount}
                    onChange={(e) => setPromotionFormData(prev => ({ ...prev, discount: e.target.value }))}
                    placeholder="20%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-valid-until">Действует до</Label>
                  <Input
                    id="promo-valid-until"
                    type="date"
                    value={promotionFormData.validUntil}
                    onChange={(e) => setPromotionFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSavePromotion}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* News Block */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2 mb-0">
              <Newspaper className="h-5 w-5" />
              Новости
            </h2>
            <Button size="sm" onClick={() => handleOpenNewsDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
          
          <div className="content-card">
            <div className="space-y-2">
              {displayedNews.map((news) => (
                <div
                  key={news.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {news.isEvent && (
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <span className="text-sm text-muted-foreground flex-shrink-0">
                    {news.date}
                  </span>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">
                    {news.title}
                  </span>
                  {news.isEvent && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex-shrink-0">
                      Событие
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenNewsDialog(news.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNews(news.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {!showAllNews && mockNews.length > 5 && (
              <button
                onClick={() => setShowAllNews(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Все →
              </button>
            )}
            {showAllNews && (
              <button
                onClick={() => setShowAllNews(false)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Свернуть
              </button>
            )}
          </div>
        </div>

        {/* News Edit Dialog */}
        <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{newsFormData.id === "new" ? "Создание новости" : "Редактирование новости"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="news-title">Заголовок</Label>
                <Input
                  id="news-title"
                  value={newsFormData.title}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Заголовок новости"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="news-content">Содержание</Label>
                <Textarea
                  id="news-content"
                  value={newsFormData.content}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Текст новости..."
                  rows={4}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="news-date">Дата</Label>
                <Input
                  id="news-date"
                  type="date"
                  value={newsFormData.date}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              {/* Is Event Flag */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="news-is-event"
                  checked={newsFormData.isEvent}
                  onCheckedChange={(checked) => setNewsFormData(prev => ({ ...prev, isEvent: checked === true }))}
                />
                <Label htmlFor="news-is-event" className="cursor-pointer">
                  Это событие
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveNews}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Links */}
        <div>
          <h2 className="section-title">Управление</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboardLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="content-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{link.label}</p>
                    </div>
                    {link.count !== undefined && (
                      <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded">
                        {link.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Dashboard;
