import { MainLayout } from "@/components/layout/MainLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { useToast } from "@/hooks/use-toast";
import { useBusinesses } from "@/hooks/use-businesses";
import { useProducts } from "@/hooks/use-products";
import { usePromotions, PromotionFormData } from "@/hooks/use-promotions";
import { useNews, NewsFormData } from "@/hooks/use-news";
import { useExchangeCount } from "@/hooks/use-exchange-count";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ExchangeRequestsDialog } from "@/components/ExchangeRequestsDialog";
import { supabase } from "@/integrations/supabase/client";

// Import new dashboard components
import { ProfileHeader } from "@/components/dashboard/sections/ProfileHeader";
import { BusinessCardsSection } from "@/components/dashboard/sections/BusinessCardsSection";
import { ProductsSection } from "@/components/dashboard/sections/ProductsSection";
import { PromotionsSection } from "@/components/dashboard/sections/PromotionsSection";
import { NewsSection } from "@/components/dashboard/sections/NewsSection";
import { MessagesDialog } from "@/components/dashboard/dialogs/MessagesDialog";
import { WalletDialog } from "@/components/dashboard/dialogs/WalletDialog";
import { EditProfileDialog } from "@/components/dashboard/dialogs/EditProfileDialog";
import { PromotionDialog } from "@/components/dashboard/dialogs/PromotionDialog";
import { NewsDialog } from "@/components/dashboard/dialogs/NewsDialog";

// Import types
import type {
  ProfileData,
  ProfileFormData,
  MessageWithSender,
  MessageTypeFilter,
  TransactionHistoryItem,
  TransactionViewMode,
  UserOption,
} from "@/components/dashboard/types/dashboard-types";

// URL для Edge Function process-notifications
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-notifications`
  : "";

// Функция вызова Edge Function для отправки уведомлений
const triggerNotifications = async () => {
  if (!EDGE_FUNCTION_URL) {
    console.log("[DEBUG] Edge Function URL not configured");
    return;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
    });
    console.log("[DEBUG] Dashboard notifications response:", response.status);
  } catch (error) {
    console.error("[DEBUG] Error triggering notifications:", error);
  }
};

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

// Проверка URL на blob (нельзя сохранять в БД)
const isBlobUrl = (url: string): boolean => {
  return url.startsWith('blob:');
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: userLoading } = useCurrentUserWithRole();
  const isNewUser = searchParams.get("new") === "true";
  const { toast } = useToast();

  // State
  const [mainCardId, setMainCardId] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [user?.id]);

  // Open profile dialog for new users
  useEffect(() => {
    if (isNewUser && !userLoading) {
      setIsProfileDialogOpen(true);
    }
  }, [isNewUser, userLoading]);

  const handleProfileSaveSuccess = async () => {
    setSearchParams({}, { replace: true });

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

  const setSearchParams = (params: Record<string, string>, options: { replace: boolean }) => {
    // Simple implementation - in real app would use proper setter
  };

  // Business cards
  const {
    businesses,
    loading: businessesLoading,
    createBusiness,
    hideBusiness,
    deleteBusiness,
    updateBusinessStatus,
  } = useBusinesses();

  // Products
  const { products, loading: productsLoading, createProduct, deleteProduct } = useProducts();

  // Promotions
  const {
    promotions,
    loading: promotionsLoading,
    createPromotion,
    updatePromotion,
    deletePromotion,
  } = usePromotions(user?.id || null);

  // News
  const { news, loading: newsLoading, createNews, updateNews, deleteNews } = useNews(user?.id || null);

  // Promotion state
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

  // News state
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCountByType, setUnreadCountByType] = useState<Record<MessageTypeFilter, number>>({
    all: 0,
    admin_status: 0,
    from_admin: 0,
    chat: 0,
    exchange: 0,
    income: 0,
    coin_request: 0,
    order: 0,
  });

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionViewMode, setTransactionViewMode] = useState<TransactionViewMode>("transfers");
  const [hashInput, setHashInput] = useState("");
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const [hashError, setHashError] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [selectedTransactionHash, setSelectedTransactionHash] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const { count: exchangeCount } = useExchangeCount(profileId);

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

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        return;
      }

      if (data) {
        let avatarUrl = data.logo_url || "";
        // Проверка на blob URL - очищаем если найден
        if (isBlobUrl(avatarUrl)) {
          avatarUrl = "";
        }
        
        const loaded: ProfileData = {
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          gps_lat: data.gps_lat?.toString() || "",
          gps_lng: data.gps_lng?.toString() || "",
          logo_url: avatarUrl,
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
          avatar: avatarUrl,
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

  // Profile handlers
  const handleMainCardChange = (cardId: string, checked: boolean) => {
    setMainCardId(checked ? cardId : null);
  };

  const handleOpenEditDialog = async () => {
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
    const isClient = user.roles?.includes("client");
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};

    const nameParts = formData.name.trim().split(" ");
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";

    if (isClient) {
      if (!first_name) newErrors.name = "Имя обязательно";
      if (!last_name) newErrors.name = "Укажите имя и фамилию";
      if (!formData.phone.trim()) newErrors.phone = "Телефон обязателен";
      if (!formData.city) newErrors.city = "Город/Село обязазателен";
      if (!formData.address.trim()) newErrors.address = "Адрес обязателен";
      if (!formData.avatar.trim()) newErrors.avatar = "Логотип обязателен";
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setFormErrors({});

    // Проверка на blob URL перед сохранением
    if (isBlobUrl(formData.avatar)) {
      toast({
        title: "Ошибка изображения",
        description: "Изображение аватара не загружено корректно. Пожалуйста, загрузите изображение заново.",
        variant: "destructive",
      });
      return;
    }

    const profileDataUpdate = {
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

    const { error } = await supabase.from("profiles").upsert(profileDataUpdate, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Ошибка сохранения", description: error.message, variant: "destructive" });
      return;
    }

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

    toast({ title: "Профиль сохранён", description: "Данные успешно обновлены" });
    setIsEditDialogOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploadError(null);
    
    // Проверка на blob URL в текущем аватаре
    if (formData.avatar && isBlobUrl(formData.avatar)) {
      setFormData((prev) => ({ ...prev, avatar: "" }));
    }
    
    const result = await uploadAvatar(user.id, file);
    if (result.success && result.url) {
      setFormData((prev) => ({ ...prev, avatar: result.url }));
    } else {
      setUploadError(result.error || "Ошибка загрузки");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

  // Promotion handlers
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
      setPromotionFormData({ title: "", description: "", discount: "", image_url: "", valid_until: "", business_id: "" });
    }
    setPromotionUploadError(null);
    setIsPromotionDialogOpen(true);
  };

  const handleSavePromotion = async () => {
    if (!promotionFormData.business_id) {
      toast({ title: "Ошибка", description: "Выберите визитку для акции", variant: "destructive" });
      return;
    }

    if (editingPromotionId) {
      await updatePromotion(editingPromotionId, promotionFormData);
    } else {
      await createPromotion(promotionFormData);
      triggerNotifications();
    }
    setIsPromotionDialogOpen(false);
  };

  const handlePromotionFileUpload = async (file: File) => {
    if (!user) return;
    setPromotionUploadError(null);
    
    // Проверка на blob URL в текущем изображении акции
    if (promotionFormData.image_url && isBlobUrl(promotionFormData.image_url)) {
      setPromotionFormData((prev) => ({ ...prev, image_url: "" }));
    }
    
    const fileExt = file.name.split(".").pop();
    const fileName = `promo_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);

    if (uploadError) {
      setPromotionUploadError("Ошибка загрузки изображения");
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setPromotionFormData((prev) => ({ ...prev, image_url: publicUrl }));
  };

  const handlePromotionDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPromotionDragging(true);
  };

  const handlePromotionDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPromotionDragging(false);
  };

  const handlePromotionDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

  // News handlers
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
      setNewsFormData({ title: "", content: "", is_event: false, event_date: "" });
    }
    setIsNewsDialogOpen(true);
  };

  const handleSaveNews = async () => {
    if (editingNewsId) {
      await updateNews(editingNewsId, newsFormData);
    } else {
      await createNews(newsFormData);
      triggerNotifications();
    }
    setIsNewsDialogOpen(false);
  };

  // Messages handlers
  const loadMessages = async () => {
    if (!user?.id) return;
    setMessagesLoading(true);

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .or(`to_id.eq.${user.id},from_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      setMessagesLoading(false);
      return;
    }

    const userIds = [...new Set((messagesData || []).flatMap((m) => [m.from_id, m.to_id]))];

    let profilesMap: Record<string, { name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name, email").in("user_id", userIds);

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

    const messagesWithSender: MessageWithSender[] = (messagesData || []).map((m) => ({
      ...m,
      senderName: profilesMap[m.from_id]?.name || "Неизвестный",
      senderEmail: profilesMap[m.from_id]?.email || "",
      reply_to: m.reply_to || null,
    }));

    setMessages(messagesWithSender);
    setMessagesLoading(false);
  };

  const handleOpenMessagesDialog = async () => {
    setIsMessagesDialogOpen(true);
    await loadMessages();
  };

  const handleSendReply = async (message: MessageWithSender, text: string) => {
    if (!text?.trim() || !user?.id) return;

    const recipientId = message.from_id === user.id ? message.to_id : message.from_id;

    const { error } = await supabase.from("messages").insert({
      from_id: user.id,
      to_id: recipientId,
      message: text.trim(),
      type: "chat" as const,
      reply_to: message.id,
    });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    } else {
      toast({ title: "Ответ отправлен", description: "Сообщение отправлено" });
      await loadMessages();
    }
  };

  const handleDeleteMessages = async (ids: number[]) => {
    const { error } = await supabase.from("messages").update({ type: "deleted" as const }).in("id", ids);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить сообщение(я)", variant: "destructive" });
    } else {
      toast({ title: "Удалено", description: "Сообщение(я) удалено(ы)" });
      await loadMessages();
    }
  };

  // Update unread counts
  useEffect(() => {
    if (user?.id) {
      const totalCount = messages.filter((m) => m.to_id === user.id && !m.is_read).length;
      setUnreadCount(totalCount);

      const byType: Record<MessageTypeFilter, number> = {
        all: 0,
        admin_status: 0,
        from_admin: 0,
        chat: 0,
        exchange: 0,
        income: 0,
        coin_request: 0,
        order: 0,
      };

      messages.filter((m) => m.to_id === user.id && !m.is_read).forEach((m) => {
        if (m.type in byType) {
          byType[m.type as MessageTypeFilter]++;
        }
      });

      setUnreadCountByType(byType);
    }
  }, [messages, user?.id]);

  // Wallet handlers
  const openWalletDialog = async () => {
    setAllUsers([]);
    const { data } = await supabase.from("profiles").select("id, first_name, last_name").neq("user_id", user?.id || "");

    if (data) {
      setAllUsers(data.map((p) => ({ id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени" })));
    }
    setWalletDialogOpen(true);
  };

  const handleTransfer = async (recipientId: string, amount: number, message: string) => {
    if (!profileId) return;

    const { data: hashResult, error: transferError } = await supabase.rpc("transfer_coins", {
      p_from_profile: profileId,
      p_to_profile: recipientId,
      p_amount: amount,
    });

    if (transferError) {
      throw new Error(transferError.message);
    }

    await supabase.from("transactions").insert({ from_id: profileId, to_id: recipientId, amount, hash: hashResult });
    setWalletBalance((prev) => prev - amount);

    toast({ title: "Перевод выполнен", description: `Переведено ${amount} долей` });
  };

  const handleReceiveCoinRequest = async (amount: number, message: string, imageFile: File | null) => {
    if (!imageFile || !profileId || !user?.id) return;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("coin-requests").upload(fileName, imageFile, { upsert: true });

    if (uploadError) {
      throw new Error("Ошибка загрузки изображения");
    }

    const { data: { publicUrl } } = supabase.storage.from("coin-requests").getPublicUrl(fileName);
    const { data: adminUserId } = await supabase.rpc("find_super_admin" as any);

    if (!adminUserId) {
      throw new Error("Администратор не найден");
    }

    const senderName = formData.name || "Пользователь";
    const requestMessage = `🪙 Запрос на получение койнов\nОт: ${senderName}\nID профиля: ${profileId}\nСумма: ${amount} долей\nКвитанция: ${publicUrl}`;

    await supabase.from("messages").insert({
      from_id: user.id,
      to_id: adminUserId,
      message: requestMessage,
      type: "coin_request" as const,
    });

    toast({ title: "Запрос отправлен", description: `Запрос на ${amount} долей отправлен администратору` });
  };

  const loadTransfers = async () => {
    if (!profileId) return;
    setTransactionsLoading(true);

    const { data: transfers, error: transfersError } = await supabase
      .from("transactions")
      .select("id, from_id, to_id, amount, when, hash")
      .or(`from_id.eq.${profileId},to_id.eq.${profileId}`)
      .order("when", { ascending: false })
      .limit(50);

    if (transfersError) {
      setTransactionHistory([]);
      setTransactionsLoading(false);
      return;
    }

    const counterpartyIds = (transfers || []).map((t) => (t.from_id === profileId ? t.to_id : t.from_id));
    const uniqueIds = [...new Set(counterpartyIds)];

    let profileMap = new Map<string, string>();
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", uniqueIds);
      profileMap = new Map(profiles?.map((p) => [p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Пользователь"]) || []);
    }

    const items: TransactionHistoryItem[] = (transfers || []).map((t) => ({
      id: t.id,
      type: t.from_id === profileId ? "transfer_out" : "transfer_in",
      amount: t.amount,
      date: t.when,
      counterparty: profileMap.get(t.from_id === profileId ? t.to_id : t.from_id),
      hash: t.hash,
    }));

    setTransactionHistory(items);
    setTransactionsLoading(false);
  };

  const loadExchanges = async () => {
    if (!profileId) return;
    setTransactionsLoading(true);

    const { data: coins, error: coinsError } = await supabase
      .from("coins")
      .select("id, amount, when, profile_balance, hash")
      .eq("who", profileId)
      .order("when", { ascending: false })
      .limit(50);

    if (coinsError) {
      setTransactionHistory([]);
      setTransactionsLoading(false);
      return;
    }

    const items: TransactionHistoryItem[] = (coins || []).map((c) => ({
      id: c.id,
      type: "coin_exchange" as const,
      amount: c.amount,
      date: c.when,
      balance_after: c.profile_balance,
      hash: c.hash,
    }));

    setTransactionHistory(items);
    setTransactionsLoading(false);
  };

  const handleLoadTransactions = async (mode: TransactionViewMode) => {
    if (mode === "transfers") {
      await loadTransfers();
    } else {
      await loadExchanges();
    }
  };

  const handleDecodeHash = async () => {
    if (!hashInput.trim()) {
      setHashError("Введите хеш для декодирования");
      return;
    }

    setHashError("");
    setDecodedResult(null);
    setDecoding(true);

    try {
      const { data, error } = await supabase.rpc("decode_coin_hash", { p_hash_text: hashInput.trim() });

      if (error) {
        setHashError(error.message);
      } else {
        setDecodedResult(data);
      }
    } catch {
      setHashError("Ошибка декодирования");
    } finally {
      setDecoding(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          formData={formData}
          userRoles={user?.roles}
          unreadCount={unreadCount}
          exchangeCount={exchangeCount}
          walletBalance={walletBalance}
          onOpenWallet={openWalletDialog}
          onOpenMessages={handleOpenMessagesDialog}
          onOpenEdit={handleOpenEditDialog}
          onOpenExchangeRequests={() => {}}
        />

        {/* Business Cards */}
        <BusinessCardsSection
          businesses={businesses.map((b) => ({
            id: b.id,
            name: b.name,
            content_json: b.content_json,
            status: b.status as "published" | "moderation" | "draft",
          }))}
          loading={businessesLoading}
          mainCardId={mainCardId}
          onCardClick={(id) => navigate(`/dashboard/business-card/${id}`)}
          onMainCardChange={handleMainCardChange}
          onStatusChange={updateBusinessStatus}
          onDelete={deleteBusiness}
          onCreate={async () => {
            const newBusiness = await createBusiness({ name: "Новая визитка" });
            if (newBusiness) navigate(`/dashboard/business-card/${newBusiness.id}`);
          }}
        />

        {/* Products */}
        <ProductsSection
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            image_url: p.image_url,
            price: p.price,
          }))}
          loading={productsLoading}
          onProductClick={(id) => navigate(`/dashboard/product/${id}`)}
          onDelete={deleteProduct}
          onCreate={async () => {
            const newProduct = await createProduct({ name: "Новый товар" });
            if (newProduct) navigate(`/dashboard/product/${newProduct.id}`);
          }}
        />

        {/* Promotions */}
        <PromotionsSection
          promotions={promotions.map((p) => ({
            id: p.id,
            title: p.title,
            image_url: p.image_url,
            discount: p.discount,
            valid_until: p.valid_until,
          }))}
          loading={promotionsLoading}
          onPromotionClick={handleOpenPromotionDialog}
          onDelete={deletePromotion}
          onCreate={() => handleOpenPromotionDialog()}
        />

        {/* News */}
        <NewsSection
          news={news.map((n) => ({
            id: n.id,
            title: n.title,
            created_at: n.created_at,
            is_event: n.is_event,
            event_date: n.event_date,
          }))}
          loading={newsLoading}
          onCreate={() => handleOpenNewsDialog()}
          onEdit={handleOpenNewsDialog}
          onDelete={deleteNews}
        />

        {/* Dialogs */}
        <MessagesDialog
          open={isMessagesDialogOpen}
          onOpenChange={setIsMessagesDialogOpen}
          messages={messages}
          loading={messagesLoading}
          unreadCount={unreadCount}
          unreadCountByType={unreadCountByType}
          onLoadMessages={loadMessages}
          onSendReply={handleSendReply}
          onDeleteMessages={handleDeleteMessages}
          currentUserId={user?.id || ""}
          userRoles={user?.roles}
        />

        <WalletDialog
          open={walletDialogOpen}
          onOpenChange={setWalletDialogOpen}
          balance={walletBalance}
          profileId={profileId}
          allUsers={allUsers}
          transactionHistory={transactionHistory}
          transactionsLoading={transactionsLoading}
          transactionViewMode={transactionViewMode}
          onTransfer={handleTransfer}
          onReceiveCoinRequest={handleReceiveCoinRequest}
          onLoadTransactions={handleLoadTransactions}
          onTransactionViewModeChange={(mode) => {
            setTransactionViewMode(mode);
            handleLoadTransactions(mode);
          }}
          onDecodeHash={handleDecodeHash}
          hashInput={hashInput}
          setHashInput={setHashInput}
          decodedResult={decodedResult}
          hashError={hashError}
          decoding={decoding}
          onViewTransactionHash={setSelectedTransactionHash}
          selectedTransactionHash={selectedTransactionHash}
        />

        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          initialData={formData}
          errors={formErrors}
          isClient={user?.roles?.includes("client") || false}
          onSave={handleSaveProfile}
          onFieldChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
          onAvatarUpload={handleFileUpload}
          onRemoveAvatar={handleRemoveAvatar}
          isDragging={isDragging}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInputChange={handleFileInputChange}
        />

        <PromotionDialog
          open={isPromotionDialogOpen}
          onOpenChange={setIsPromotionDialogOpen}
          initialData={promotionFormData}
          businesses={businesses.map((b) => ({ id: b.id, name: b.name, status: b.status }))}
          uploadError={promotionUploadError}
          isDragging={promotionDragging}
          fileInputRef={promotionFileInputRef}
          onSave={handleSavePromotion}
          onFieldChange={(field, value) => setPromotionFormData((prev) => ({ ...prev, [field]: value }))}
          onImageUpload={handlePromotionFileUpload}
          onRemoveImage={handleRemovePromotionImage}
          onDragOver={handlePromotionDragOver}
          onDragLeave={handlePromotionDragLeave}
          onDrop={handlePromotionDrop}
          onFileInputChange={handlePromotionFileInputChange}
        />

        <NewsDialog
          open={isNewsDialogOpen}
          onOpenChange={setIsNewsDialogOpen}
          initialData={newsFormData}
          onSave={handleSaveNews}
          onFieldChange={(field, value) => setNewsFormData((prev) => ({ ...prev, [field]: value }))}
        />

        <ProfileEditDialog
          open={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          isNewUser={isNewUser}
          onSaveSuccess={handleProfileSaveSuccess}
        />

        <ExchangeRequestsDialog open={false} onOpenChange={() => {}} profileId={profileId} />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
