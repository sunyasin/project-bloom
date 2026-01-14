import { MainLayout } from "@/components/layout/MainLayout";
import {
  User,
  Tag,
  Bell,
  Newspaper,
  Package,
  Plus,
  Pencil,
  Upload,
  X,
  MapPin,
  Percent,
  Trash2,
  Calendar,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Wallet,
  Key,
  Search,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, DragEvent, useEffect } from "react";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { useToast } from "@/hooks/use-toast";
import { useBusinesses } from "@/hooks/use-businesses";
import { useProducts } from "@/hooks/use-products";
import { usePromotions, Promotion, PromotionFormData } from "@/hooks/use-promotions";
import { useNews, NewsFormData } from "@/hooks/use-news";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ============= Mock API functions =============

// Загрузка аватара в Supabase Storage
const uploadAvatar = async (
  userId: string,
  file: File,
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: "Ошибка загрузки файла" };
  }
};

// Валидация изображения
const validateImage = (file: File) => {
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

// Placeholder image for business cards without images
const DEFAULT_BUSINESS_IMAGE = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop";
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200&h=200&fit=crop";
const DEFAULT_PROMO_IMAGE = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=200&fit=crop";

// ============= Messages types =============

interface MessageWithSender {
  id: number;
  from_id: string;
  to_id: string;
  message: string;
  type: string;
  created_at: string;
  senderName: string;
  senderEmail: string;
}

// ============= End Messages types =============

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
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
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
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

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
      setFormData((prev) => ({
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
  const {
    businesses,
    loading: businessesLoading,
    createBusiness,
    hideBusiness,
    deleteBusiness,
    updateBusinessStatus,
  } = useBusinesses();

  // Products from Supabase
  const { products, loading: productsLoading, createProduct, deleteProduct } = useProducts();

  // Promotions from Supabase
  const {
    promotions,
    loading: promotionsLoading,
    createPromotion,
    updatePromotion,
    deletePromotion,
  } = usePromotions(user?.id || null);

  // News from Supabase
  const { news, loading: newsLoading, createNews, updateNews, deleteNews } = useNews(user?.id || null);

  // Promotion editing state
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [promotionDragging, setPromotionDragging] = useState(false);
  const [promotionUploadError, setPromotionUploadError] = useState<string | null>(null);
  const promotionFileInputRef = useRef<HTMLInputElement>(null);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [promotionFormData, setPromotionFormData] = useState<PromotionFormData>({
    title: "",
    description: "",
    discount: "",
    image_url: "",
    valid_until: "",
    business_id: "",
  });

  // News editing state
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsFormData, setNewsFormData] = useState<NewsFormData>({
    title: "",
    content: "",
    is_event: false,
    event_date: "",
  });

  // Messages state
  const [isMessagesDialogOpen, setIsMessagesDialogOpen] = useState(false);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);
  const { toast } = useToast();

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferError, setTransferError] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Hash decode state
  const [hashDialogOpen, setHashDialogOpen] = useState(false);
  const [hashInput, setHashInput] = useState("");
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const [hashError, setHashError] = useState("");
  const [decoding, setDecoding] = useState(false);
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

      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

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
        setWalletBalance(data.wallet || 0);
        setProfileId(data.id);
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

    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

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

    // Validate required fields for client role
    const isClient = user.role === "client";
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};

    // Parse name into first_name and last_name
    const nameParts = formData.name.trim().split(" ");
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";

    if (isClient) {
      if (!first_name) {
        newErrors.name = "Имя обязательно";
      }
      if (!last_name) {
        newErrors.name = "Укажите имя и фамилию";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Телефон обязателен";
      }
      if (!formData.city) {
        newErrors.city = "Город/Село обязателен";
      }
      if (!formData.address.trim()) {
        newErrors.address = "Адрес обязателен";
      }
      if (!formData.avatar.trim()) {
        newErrors.avatar = "Логотип обязателен";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setFormErrors({});

    const profileData = {
      user_id: user.id,
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

    const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "user_id" });

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
    if (!user) return;

    setUploadError(null);
    const validation = validateImage(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    const result = await uploadAvatar(user.id, file);
    if (result.success && result.url) {
      setFormData((prev) => ({ ...prev, avatar: result.url }));
    } else {
      setUploadError(result.error || "Ошибка загрузки");
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
    setFormData((prev) => ({ ...prev, avatar: "" }));
  };

  // ============= Promotion handlers =============

  const handleOpenPromotionDialog = (promotionId?: string) => {
    if (promotionId) {
      const promotion = promotions.find((p) => p.id === promotionId);
      if (promotion) {
        setEditingPromotionId(promotionId);
        setPromotionFormData({
          title: promotion.title,
          description: promotion.description || "",
          discount: promotion.discount,
          image_url: promotion.image_url || "",
          valid_until: promotion.valid_until ? promotion.valid_until.split("T")[0] : "",
          business_id: promotion.business_id || "",
        });
      }
    } else {
      setEditingPromotionId(null);
      setPromotionFormData({
        title: "",
        description: "",
        discount: "",
        image_url: "",
        valid_until: "",
        business_id: "",
      });
    }
    setPromotionUploadError(null);
    setIsPromotionDialogOpen(true);
  };

  const handleSavePromotion = async () => {
    if (editingPromotionId) {
      await updatePromotion(editingPromotionId, promotionFormData);
    } else {
      await createPromotion(promotionFormData);
    }
    setIsPromotionDialogOpen(false);
  };

  const handleDeletePromotion = async (id: string) => {
    await deletePromotion(id);
  };

  const handlePromotionFileUpload = async (file: File) => {
    if (!user) return;
    
    setPromotionUploadError(null);
    const validation = validateImage(file);
    if (!validation.valid) {
      setPromotionUploadError(validation.error);
      return;
    }

    // Upload to Supabase Storage - use user.id as folder name to match RLS policy
    const fileExt = file.name.split(".").pop();
    const fileName = `promo_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setPromotionUploadError("Ошибка загрузки изображения");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(filePath);

    setPromotionFormData((prev) => ({ ...prev, image_url: publicUrl }));
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
    setPromotionFormData((prev) => ({ ...prev, image_url: "" }));
  };

  // ============= News handlers =============

  const handleOpenNewsDialog = (newsId?: string) => {
    if (newsId) {
      const newsItem = news.find((n) => n.id === newsId);
      if (newsItem) {
        setEditingNewsId(newsId);
        setNewsFormData({
          title: newsItem.title,
          content: newsItem.content || "",
          is_event: newsItem.is_event,
          event_date: newsItem.event_date || "",
        });
      }
    } else {
      setEditingNewsId(null);
      setNewsFormData({
        title: "",
        content: "",
        is_event: false,
        event_date: "",
      });
    }
    setIsNewsDialogOpen(true);
  };

  const handleSaveNews = async () => {
    if (editingNewsId) {
      await updateNews(editingNewsId, newsFormData);
    } else {
      await createNews(newsFormData);
    }
    setIsNewsDialogOpen(false);
  };

  const handleDeleteNewsItem = async (id: string) => {
    await deleteNews(id);
  };

  const displayedNews = showAllNews ? news : news.slice(0, 5);

  // ============= Messages handlers =============

  const loadMessages = async () => {
    if (!user?.id) return;
    
    setMessagesLoading(true);
    
    // Fetch messages where current user is recipient
    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("to_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading messages:", error);
      setMessagesLoading(false);
      return;
    }
    
    // Get unique sender IDs
    const senderIds = [...new Set((messagesData || []).map(m => m.from_id))];
    
    // Fetch sender profiles
    let profilesMap: Record<string, { name: string; email: string }> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", senderIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.user_id] = {
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
            email: p.email || "",
          };
          return acc;
        }, {} as Record<string, { name: string; email: string }>);
      }
    }
    
    // Merge messages with sender info
    const messagesWithSender: MessageWithSender[] = (messagesData || []).map(m => ({
      ...m,
      senderName: profilesMap[m.from_id]?.name || "Неизвестный",
      senderEmail: profilesMap[m.from_id]?.email || "",
    }));
    
    setMessages(messagesWithSender);
    setMessagesLoading(false);
  };

  const handleOpenMessagesDialog = async () => {
    setIsMessagesDialogOpen(true);
    await loadMessages();
  };

  const handleToggleMessage = (messageId: number) => {
    if (expandedMessageId === messageId) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(messageId);
    }
  };

  const handleSendReply = async (message: MessageWithSender) => {
    const text = replyText[message.id];
    if (!text?.trim() || !user?.id) return;

    setIsSendingReply(true);
    
    // Send reply (swap from_id and to_id)
    const { error } = await supabase.from("messages").insert({
      from_id: user.id,
      to_id: message.from_id,
      message: text.trim(),
      type: "chat" as const,
    });
    
    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Ответ отправлен",
        description: `Сообщение отправлено ${message.senderName}`,
      });
      setReplyText((prev) => ({ ...prev, [message.id]: "" }));
    }
    
    setIsSendingReply(false);
  };

  const unreadCount = messages.length;

  // Wallet handlers
  const openWalletDialog = async () => {
    setTransferAmount("");
    setSelectedRecipient("");
    setTransferError("");

    // Fetch all profiles except current user
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .neq("user_id", user?.id || "");

    if (data) {
      setAllUsers(
        data.map((p) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
        })),
      );
    }
    setWalletDialogOpen(true);
  };

  const handleTransfer = async () => {
    setTransferError("");

    const amount = parseInt(transferAmount, 10);
    if (!amount || amount <= 0) {
      setTransferError("Введите корректную сумму");
      return;
    }
    if (amount > walletBalance) {
      setTransferError("Недостаточно средств на балансе");
      return;
    }
    if (!selectedRecipient) {
      setTransferError("Выберите получателя");
      return;
    }
    if (!profileId) {
      setTransferError("Профиль не найден");
      return;
    }

    setTransferring(true);

    const { error } = await supabase.from("transactions").insert({
      from_id: profileId,
      to_id: selectedRecipient,
      amount: amount,
    });

    if (error) {
      setTransferError("Ошибка перевода: " + error.message);
      setTransferring(false);
      return;
    }

    // Update local balance
    setWalletBalance((prev) => prev - amount);
    setWalletDialogOpen(false);
    toast({
      title: "Перевод выполнен",
      description: `Переведено ${amount} на счёт получателя`,
    });
    setTransferring(false);
  };

  // Hash decode handler
  const handleDecodeHash = async () => {
    if (!hashInput.trim()) {
      setHashError("Введите хеш для декодирования");
      return;
    }

    setHashError("");
    setDecodedResult(null);
    setDecoding(true);

    try {
      const { data, error } = await supabase.rpc("decode_coin_hash", {
        p_hash_text: hashInput.trim(),
      });

      if (error) {
        setHashError(error.message);
      } else {
        setDecodedResult(data);
      }
    } catch (err) {
      setHashError("Ошибка декодирования");
    } finally {
      setDecoding(false);
    }
  };

  const openHashDialog = () => {
    setHashInput("");
    setDecodedResult(null);
    setHashError("");
    setHashDialogOpen(true);
  };
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
                {user?.role || 'visitor'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={openWalletDialog}>
                <Wallet className="h-4 w-4 mr-1" />
                Кошелёк ({walletBalance})
              </Button>
              <Button variant="outline" size="sm" onClick={openHashDialog}>
                <Key className="h-4 w-4 mr-1" />
                Проверка хешей
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenMessagesDialog}>
                <MessageCircle className="h-4 w-4 mr-1" />
                Сообщения
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
                <Label>
                  Логотип / Аватар <span className="text-destructive">*</span>
                </Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : formErrors.avatar
                        ? "border-destructive"
                        : "border-border hover:border-primary/50"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAvatar();
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
                    onChange={(e) => {
                      handleFileInputChange(e);
                      if (formErrors.avatar) setFormErrors((prev) => ({ ...prev, avatar: undefined }));
                    }}
                  />
                </div>
                {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                {formErrors.avatar && <p className="text-xs text-destructive">{formErrors.avatar}</p>}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Имя и Фамилия <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                  />
                  {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Телефон <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="+7 (999) 123-45-67"
                />
                {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
              </div>

              {/* City & Address */}
              <div className="space-y-2">
                <Label htmlFor="city">
                  Город / село <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, city: value }));
                    if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите населённый пункт" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
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
                    ].map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.city && <p className="text-xs text-destructive">{formErrors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Адрес <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, address: e.target.value }));
                    if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder="ул. Фермерская, д. 15"
                  rows={2}
                />
                {formErrors.address && <p className="text-xs text-destructive">{formErrors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Широта
                  </Label>
                  <Input
                    id="lat"
                    value={formData.lat}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lat: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, lng: e.target.value }))}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, telegram: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-20">VK</span>
                    <Input
                      value={formData.vk}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vk: e.target.value }))}
                      placeholder="https://vk.com/..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-20">Instagram</span>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData((prev) => ({ ...prev, instagram: e.target.value }))}
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
              <Button onClick={handleSaveProfile}>Сохранить</Button>
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
                  const imageUrl = (card.content_json as { image?: string })?.image || DEFAULT_BUSINESS_IMAGE;
                  return (
                    <div key={card.id} className="flex flex-col">
                      <button
                        onClick={() => navigate(`/dashboard/business-card/${card.id}`)}
                        className={`content-card hover:border-primary/30 transition-all hover:shadow-md group p-3 text-left relative ${
                          mainCardId === card.id ? "ring-2 ring-primary border-primary" : ""
                        }`}
                      >
                        {/* Status badge */}
                        <div
                          className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs rounded ${
                            card.status === "published"
                              ? "bg-green-500/20 text-green-700"
                              : card.status === "moderation"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {card.status === "published"
                            ? "опубл."
                            : card.status === "moderation"
                              ? "модер."
                              : "черновик"}
                        </div>
                        <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                          <img
                            src={imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground text-center truncate">{card.name}</p>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newStatus = card.status === "published" ? "draft" : "published";
                                  updateBusinessStatus(card.id, newStatus);
                                }}
                              >
                                {card.status === "published" ? (
                                  <Eye className="h-3 w-3 text-green-600" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {card.status === "published" ? "Скрыть (перевести в черновик)" : "Опубликовать"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBusiness(card.id);
                                }}
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
          {promotionsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {promotions.map((promotion) => (
                <div key={promotion.id} className="flex flex-col">
                  <button
                    onClick={() => handleOpenPromotionDialog(promotion.id)}
                    className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 text-left group"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                      <img
                        src={promotion.image_url || DEFAULT_PROMO_IMAGE}
                        alt={promotion.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{promotion.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {promotion.discount}
                      </span>
                      {promotion.valid_until && (
                        <span className="text-xs text-muted-foreground">
                          до {new Date(promotion.valid_until).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex justify-end mt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePromotion(promotion.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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
          )}
        </div>

        {/* Promotion Edit Dialog */}
        <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPromotionId ? "Редактирование акции" : "Создание акции"}</DialogTitle>
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
                  {promotionFormData.image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={promotionFormData.image_url}
                        alt="Promotion"
                        className="w-full max-h-40 object-cover rounded-lg mx-auto"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePromotionImage();
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
                  onChange={(e) => setPromotionFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Скидка 20% на молочные продукты"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="promo-description">Описание</Label>
                <Textarea
                  id="promo-description"
                  value={promotionFormData.description}
                  onChange={(e) => setPromotionFormData((prev) => ({ ...prev, description: e.target.value }))}
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
                    onChange={(e) => setPromotionFormData((prev) => ({ ...prev, discount: e.target.value }))}
                    placeholder="20%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-valid-until">Действует до</Label>
                  <Input
                    id="promo-valid-until"
                    type="date"
                    value={promotionFormData.valid_until}
                    onChange={(e) => setPromotionFormData((prev) => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSavePromotion}>Сохранить</Button>
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

          {newsLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="content-card">
              {displayedNews.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет новостей</p>
              ) : (
                <div className="space-y-2">
                  {displayedNews.map((newsItem) => (
                    <div
                      key={newsItem.id}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {newsItem.is_event && <Calendar className="h-4 w-4 text-primary flex-shrink-0" />}
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {new Date(newsItem.created_at).toLocaleDateString("ru-RU")}
                      </span>
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{newsItem.title}</span>
                      {newsItem.is_event && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex-shrink-0">
                          Событие
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenNewsDialog(newsItem.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNewsItem(newsItem.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showAllNews && news.length > 5 && (
                <button onClick={() => setShowAllNews(true)} className="mt-3 text-sm text-primary hover:underline">
                  Все →
                </button>
              )}
              {showAllNews && news.length > 5 && (
                <button onClick={() => setShowAllNews(false)} className="mt-3 text-sm text-primary hover:underline">
                  Свернуть
                </button>
              )}
            </div>
          )}
        </div>

        {/* News Edit Dialog */}
        <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingNewsId ? "Редактирование новости" : "Создание новости"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="news-title">Заголовок</Label>
                <Input
                  id="news-title"
                  value={newsFormData.title}
                  onChange={(e) => setNewsFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Заголовок новости"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="news-content">Содержание</Label>
                <Textarea
                  id="news-content"
                  value={newsFormData.content}
                  onChange={(e) => setNewsFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Текст новости..."
                  rows={4}
                />
              </div>

              {/* Event Date */}
              <div className="space-y-2">
                <Label htmlFor="news-date">Дата события</Label>
                <Input
                  id="news-date"
                  type="date"
                  value={newsFormData.event_date}
                  onChange={(e) => setNewsFormData((prev) => ({ ...prev, event_date: e.target.value }))}
                />
              </div>

              {/* Is Event Flag */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="news-is-event"
                  checked={newsFormData.is_event}
                  onCheckedChange={(checked) => setNewsFormData((prev) => ({ ...prev, is_event: checked === true }))}
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
              <Button onClick={handleSaveNews}>Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages Dialog */}
      <Dialog open={isMessagesDialogOpen} onOpenChange={setIsMessagesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Входящие сообщения
              {messages.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({messages.length})</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {messagesLoading ? (
              <p className="text-muted-foreground text-center py-8">Загрузка...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Нет входящих сообщений</p>
            ) : (
              messages.map((message) => {
                const isExpanded = expandedMessageId === message.id;
                const messagePreview = message.message.length > 80 
                  ? message.message.slice(0, 80) + "..." 
                  : message.message;
                
                const getTypeBadge = (type: string) => {
                  switch (type) {
                    case "exchange":
                      return <span className="text-xs bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded">Обмен</span>;
                    case "admin_status":
                      return <span className="text-xs bg-yellow-500/10 text-yellow-700 px-2 py-0.5 rounded">Статус</span>;
                    case "from_admin":
                      return <span className="text-xs bg-red-500/10 text-red-700 px-2 py-0.5 rounded">От админа</span>;
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={message.id}
                    className="border rounded-lg transition-colors border-border hover:border-primary/30"
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
                          <span className="font-medium text-foreground truncate">{message.senderName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(message.created_at).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getTypeBadge(message.type)}
                          <span className="text-xs text-muted-foreground">{message.senderEmail}</span>
                        </div>
                        {!isExpanded && <p className="text-sm text-muted-foreground truncate mt-1">{messagePreview}</p>}
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-border">
                        <p className="text-sm text-foreground py-3 whitespace-pre-wrap">{message.message}</p>

                        {/* Reply section */}
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Написать ответ..."
                            value={replyText[message.id] || ""}
                            onChange={(e) =>
                              setReplyText((prev) => ({
                                ...prev,
                                [message.id]: e.target.value,
                              }))
                            }
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(message)}
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
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Кошелёк</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Баланс: {walletBalance} долей</p>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Кому перевести:</Label>
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите получателя" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Сумма:</Label>
              <Input
                type="number"
                min="1"
                max={walletBalance}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Введите сумму"
              />
            </div>

            {transferError && <p className="text-sm text-destructive">{transferError}</p>}

            <Button onClick={handleTransfer} className="w-full" disabled={transferring}>
              {transferring ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hash Decode Dialog */}
      <Dialog open={hashDialogOpen} onOpenChange={setHashDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Проверка и декодирование хешей
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Хеш для декодирования</Label>
              <Textarea
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Вставьте hex-хеш из таблицы coins..."
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            {hashError && <p className="text-sm text-destructive">{hashError}</p>}

            {decodedResult && (
              <div className="space-y-2">
                <Label>Результат декодирования:</Label>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {decodedResult}
                </div>
                <p className="text-xs text-muted-foreground">
                  Формат: ДАТА_СУММА_баланс_пользователя_общий_баланс_UUID
                </p>
              </div>
            )}

            <Button onClick={handleDecodeHash} className="w-full" disabled={decoding}>
              <Search className="h-4 w-4 mr-2" />
              {decoding ? "Декодирование..." : "Декодировать"}
            </Button>
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
