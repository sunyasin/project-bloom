import { MainLayout } from "@/components/layout/MainLayout";
import { User, Tag, Bell, Newspaper, Package, Plus, Pencil, Upload, X, MapPin, Percent, Trash2, Calendar, MessageCircle, Send, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, DragEvent, useEffect } from "react";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { useToast } from "@/hooks/use-toast";
import { useBusinesses } from "@/hooks/use-businesses";
import { useProducts } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
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
  city: "Коломна",
  address: "ул. Фермерская, д. 15",
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

// Placeholder image for business cards without images
const DEFAULT_BUSINESS_IMAGE = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop";
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200&h=200&fit=crop";

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

// ============= Mock API для сообщений =============

// Данные сообщений
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  subject: string;
  preview: string;
  fullText: string;
  date: string;
  isRead: boolean;
}

const mockMessages: Message[] = [
  { 
    id: "1", 
    senderId: "u1", 
    senderName: "Ферма Петровых", 
    subject: "Ваш заказ готов",
    preview: "Здравствуйте! Ваш заказ на молочные продукты готов к выдаче...",
    fullText: "Здравствуйте! Ваш заказ на молочные продукты готов к выдаче. Можете забрать его в любое удобное время с 9:00 до 18:00. Адрес: д. Молоково, ул. Фермерская 5. С уважением, Ферма Петровых.",
    date: "2024-12-28",
    isRead: false
  },
  { 
    id: "2", 
    senderId: "u2", 
    senderName: "Пасека Иванова", 
    subject: "Новая акция на мёд",
    preview: "Рады сообщить о новой акции! Скидка 25% на весь ассортимент...",
    fullText: "Рады сообщить о новой акции! Скидка 25% на весь ассортимент мёда до конца января. Липовый, гречишный, цветочный мёд - всё со скидкой. Также в подарок при покупке от 2кг - баночка прополиса. Ждём вас!",
    date: "2024-12-27",
    isRead: false
  },
  { 
    id: "3", 
    senderId: "u3", 
    senderName: "Администрация портала", 
    subject: "Добро пожаловать!",
    preview: "Благодарим за регистрацию на нашем портале...",
    fullText: "Благодарим за регистрацию на нашем портале! Теперь вам доступны все функции: заказ продуктов напрямую у производителей, подписка на новости, участие в акциях и многое другое. Если у вас возникнут вопросы - пишите нам.",
    date: "2024-12-25",
    isRead: true
  },
  { 
    id: "4", 
    senderId: "u4", 
    senderName: "Сырная лавка", 
    subject: "Ответ на ваш вопрос",
    preview: "Да, у нас есть сыр с трюфелем в наличии...",
    fullText: "Да, у нас есть сыр с трюфелем в наличии. Стоимость 1800₽ за кг. Можем доставить в Коломну в ближайшую субботу. Напишите, если хотите оформить заказ.",
    date: "2024-12-24",
    isRead: true
  },
  { 
    id: "5", 
    senderId: "u5", 
    senderName: "Эко-овощи", 
    subject: "Сезонные овощи",
    preview: "Поступила свежая партия зимних овощей...",
    fullText: "Поступила свежая партия зимних овощей: морковь, свёкла, капуста, картофель. Всё выращено без химикатов. Цены ниже рыночных на 20%. Доставка по области бесплатно от 1000₽.",
    date: "2024-12-23",
    isRead: false
  },
];

// Имитация получения списка сообщений (GET /api/messages)
const mockAPIGetMessages = async () => {
  console.log("[mockAPI] GET /api/messages");
  return [...mockMessages];
};

// Имитация отправки ответа (POST /api/messages/:id/reply)
const mockAPISendReply = async (messageId: string, text: string) => {
  console.log(`[mockAPI] POST /api/messages/${messageId}/reply`, { text });
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

// Имитация отметки сообщения как прочитанного (PUT /api/messages/:id/read)
const mockAPIMarkAsRead = async (messageId: string) => {
  console.log(`[mockAPI] PUT /api/messages/${messageId}/read`);
  return { success: true };
};

// Подсчёт непрочитанных сообщений
const getUnreadCount = () => mockMessages.filter(m => !m.isRead).length;

// ============= End Mock API для сообщений =============

const dashboardLinks = [
  { label: "Акции", href: "/dashboard/promotions", icon: Tag, count: 3 },
  { label: "Сообщения", href: "/dashboard/messages", icon: Bell, count: 5 },
  { label: "Новости", href: "/dashboard/news", icon: Newspaper },
];

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  gps_lat: string;
  gps_lng: string;
  logo_url: string;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  city: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: userLoading } = useCurrentUserWithRole();
  const isNewUser = searchParams.get("new") === "true";
  
  const [mainCardId, setMainCardId] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Open profile dialog for new users
  useEffect(() => {
    if (isNewUser && !userLoading) {
      setIsProfileDialogOpen(true);
    }
  }, [isNewUser, userLoading]);
  
  const handleProfileSaveSuccess = async () => {
    // Remove ?new=true from URL
    setSearchParams({}, { replace: true });
    
    // Reload profile data
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      const loaded: ProfileData = {
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        city: data.city || "",
        address: data.address || "",
        gps_lat: data.gps_lat?.toString() || "",
        gps_lng: data.gps_lng?.toString() || "",
        logo_url: data.logo_url || "",
      };
      setProfileData(loaded);
      setFormData(prev => ({
        ...prev,
        name: `${loaded.first_name} ${loaded.last_name}`.trim() || "Новый пользователь",
        email: loaded.email,
        phone: loaded.phone,
        city: loaded.city,
        address: loaded.address,
        lat: loaded.gps_lat,
        lng: loaded.gps_lng,
        avatar: loaded.logo_url,
      }));
    }
  };
  
  // Business cards from Supabase
  const { businesses, loading: businessesLoading, createBusiness, hideBusiness, deleteBusiness } = useBusinesses();
  
  // Products from Supabase
  const { products, loading: productsLoading, createProduct, deleteProduct } = useProducts();
  
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
  
  // Messages state
  const [isMessagesDialogOpen, setIsMessagesDialogOpen] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);
  const { toast } = useToast();
  
  // Profile data from Supabase
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    lat: "",
    lng: "",
    avatar: "",
    telegram: "",
    vk: "",
    instagram: "",
  });
  
  // Load profile from Supabase
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
        return;
      }

      if (data) {
        const loaded: ProfileData = {
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          gps_lat: data.gps_lat?.toString() || "",
          gps_lng: data.gps_lng?.toString() || "",
          logo_url: data.logo_url || "",
        };
        setProfileData(loaded);
        setFormData({
          name: `${loaded.first_name} ${loaded.last_name}`.trim() || "Новый пользователь",
          email: loaded.email,
          phone: loaded.phone,
          city: loaded.city,
          address: loaded.address,
          lat: loaded.gps_lat,
          lng: loaded.gps_lng,
          avatar: loaded.logo_url,
          telegram: "",
          vk: "",
          instagram: "",
        });
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleMainCardChange = (cardId: string, checked: boolean) => {
    setMainCardId(checked ? cardId : null);
  };

  const handleOpenEditDialog = async () => {
    // Загружаем данные профиля из Supabase при открытии диалога
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (error) {
      console.error("Error loading profile:", error);
      return;
    }
    
    if (data) {
      setFormData({
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Новый пользователь",
        email: data.email || "",
        phone: data.phone || "",
        city: data.city || "",
        address: data.address || "",
        lat: data.gps_lat?.toString() || "",
        lng: data.gps_lng?.toString() || "",
        avatar: data.logo_url || "",
        telegram: "",
        vk: "",
        instagram: "",
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Parse name into first_name and last_name
    const nameParts = formData.name.trim().split(" ");
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";
    
    const updateData = {
      first_name,
      last_name,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      city: formData.city || null,
      address: formData.address.trim() || null,
      gps_lat: formData.lat ? parseFloat(formData.lat) : null,
      gps_lng: formData.lng ? parseFloat(formData.lng) : null,
      logo_url: formData.avatar.trim() || null,
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
      return;
    }

    // Update local profileData
    setProfileData({
      first_name,
      last_name,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      address: formData.address,
      gps_lat: formData.lat,
      gps_lng: formData.lng,
      logo_url: formData.avatar,
    });

    toast({
      title: "Профиль сохранён",
      description: "Данные успешно обновлены",
    });
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

  // ============= Messages handlers =============
  
  const handleToggleMessage = async (messageId: string) => {
    if (expandedMessageId === messageId) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(messageId);
      // Отмечаем как прочитанное при раскрытии
      await mockAPIMarkAsRead(messageId);
    }
  };

  const handleSendReply = async (messageId: string) => {
    const text = replyText[messageId];
    if (!text?.trim()) return;
    
    setIsSendingReply(true);
    try {
      await mockAPISendReply(messageId, text);
      toast({
        title: "Ответ отправлен",
        description: "Ваше сообщение успешно отправлено",
      });
      setReplyText(prev => ({ ...prev, [messageId]: "" }));
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const unreadCount = getUnreadCount();

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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsMessagesDialogOpen(true)}>
                <MessageCircle className="h-4 w-4 mr-1" />
                Сообщения
                {unreadCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                <Pencil className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
            </div>
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

              {/* City & Address */}
              <div className="space-y-2">
                <Label htmlFor="city">Город / село</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Коломна"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ул. Фермерская, д. 15"
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
          {businessesLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <TooltipProvider>
                {businesses.map((card) => {
                  const imageUrl = (card.content_json as { image_url?: string })?.image_url || DEFAULT_BUSINESS_IMAGE;
                  return (
                    <div key={card.id} className="flex flex-col">
                      <button
                        onClick={() => navigate(`/dashboard/business-card/${card.id}`)}
                        className={`content-card hover:border-primary/30 transition-all hover:shadow-md group p-3 text-left relative ${
                          mainCardId === card.id ? "ring-2 ring-primary border-primary" : ""
                        }`}
                      >
                        {/* Status badge */}
                        <div className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs rounded ${
                          card.status === 'published' ? 'bg-green-500/20 text-green-700' :
                          card.status === 'moderation' ? 'bg-yellow-500/20 text-yellow-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {card.status === 'published' ? 'опубл.' : card.status === 'moderation' ? 'модер.' : 'черновик'}
                        </div>
                        <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                          <img
                            src={imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground text-center truncate">
                          {card.name}
                        </p>
                      </button>
                      <div className="flex items-center justify-between mt-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label className="flex items-center gap-1 cursor-pointer">
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
                        <div className="flex gap-1">
                          {card.status === 'published' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => { e.stopPropagation(); hideBusiness(card.id); }}
                                >
                                  <EyeOff className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Скрыть</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteBusiness(card.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Удалить</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TooltipProvider>
              {/* Create new business card */}
              <button
                onClick={async () => {
                  const newBusiness = await createBusiness({ name: "Новая визитка" });
                  if (newBusiness) {
                    navigate(`/dashboard/business-card/${newBusiness.id}`);
                  }
                }}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Создать</p>
              </button>
            </div>
          )}
        </div>

        {/* Products (Товары) */}
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Package className="h-5 w-5" />
            Товары
          </h2>
          {productsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <div key={product.id} className="flex flex-col">
                  <button
                    onClick={() => navigate(`/dashboard/product/${product.id}`)}
                    className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                      <img
                        src={product.image_url || DEFAULT_PRODUCT_IMAGE}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-primary font-semibold">{product.price || 0} ₽</p>
                  </button>
                  <div className="flex justify-end mt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {/* Create new product */}
              <button
                onClick={async () => {
                  const newProduct = await createProduct({ name: "Новый товар" });
                  if (newProduct) {
                    navigate(`/dashboard/product/${newProduct.id}`);
                  }
                }}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Создать</p>
              </button>
            </div>
          )}
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

      {/* Messages Dialog */}
      <Dialog open={isMessagesDialogOpen} onOpenChange={setIsMessagesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Сообщения
              {unreadCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({unreadCount} непрочитанных)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {mockMessages.map((message) => {
              const isExpanded = expandedMessageId === message.id;
              return (
                <div
                  key={message.id}
                  className={`border rounded-lg transition-colors ${
                    !message.isRead ? "bg-primary/5 border-primary/20" : "border-border"
                  }`}
                >
                  {/* Message header - clickable */}
                  <button
                    onClick={() => handleToggleMessage(message.id)}
                    className="w-full p-3 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">
                          {message.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {message.date}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {message.subject}
                      </p>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {message.preview}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {!message.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                  
                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-border">
                      <p className="text-sm text-foreground py-3 whitespace-pre-wrap">
                        {message.fullText}
                      </p>
                      
                      {/* Reply section */}
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Написать ответ..."
                          value={replyText[message.id] || ""}
                          onChange={(e) => setReplyText(prev => ({ 
                            ...prev, 
                            [message.id]: e.target.value 
                          }))}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSendReply(message.id)}
                          disabled={isSendingReply || !replyText[message.id]?.trim()}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Отправить
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Profile Edit Dialog for new users */}
      <ProfileEditDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        isNewUser={isNewUser}
        onSaveSuccess={handleProfileSaveSuccess}
      />
    </MainLayout>
  );
};

export default Dashboard;
