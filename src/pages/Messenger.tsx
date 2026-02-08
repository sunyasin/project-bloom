import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  Reply,
  Trash2,
  Send,
  User,
  Check,
  ArrowLeft,
  Bell,
  BellOff,
} from "lucide-react";
import type {
  MessageWithSender,
  MessageTypeFilter,
  DeleteMessageConfirm,
  ConversationThread,
} from "@/components/dashboard/types/dashboard-types";
import { MESSAGE_TYPE_LABELS } from "@/components/dashboard/types/dashboard-types";
import { extractImageUrls } from "@/components/dashboard/utils/dashboard-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function Messenger() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCurrentUserWithRole();
  
  const currentUserId = user?.id || "";
  const userRoles = user?.roles || [];

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [messageTypeFilter, setMessageTypeFilter] = useState<MessageTypeFilter>("all");
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyingToMessageId, setReplyingToMessageId] = useState<number | null>(null);
  const [deleteMessageConfirm, setDeleteMessageConfirm] = useState<DeleteMessageConfirm | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [approvingCoinRequest, setApprovingCoinRequest] = useState<number | null>(null);
  const [isSubscribedToMessages, setIsSubscribedToMessages] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load messages on mount
  useEffect(() => {
    if (currentUserId) {
      loadMessages();
      checkSubscriptionStatus();
    }
  }, [currentUserId]);

  // Check subscription status
  const checkSubscriptionStatus = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("newsletter_subscriptions")
      .select("send_messages, telegram_chat_id")
      .eq("user_id", currentUserId)
      .single();
    
    setIsSubscribedToMessages(data?.send_messages === true && !!data?.telegram_chat_id);
  };

  const handleToggleMessageSubscription = async () => {
    if (!currentUserId) {
      toast({ title: "Ошибка", description: "Войдите в систему", variant: "destructive" });
      return;
    }
    
    setIsLoadingSubscription(true);
    
    const { data: existingSub } = await supabase
      .from("newsletter_subscriptions")
      .select("id, send_messages, telegram_chat_id, email")
      .eq("user_id", currentUserId)
      .single();
    
    if (existingSub?.send_messages && existingSub?.telegram_chat_id) {
      // Already subscribed - unsubscribe
      await supabase
        .from("newsletter_subscriptions")
        .update({ send_messages: false })
        .eq("id", existingSub.id);
      
      setIsSubscribedToMessages(false);
      toast({ title: "Отписка", description: "Вы отписались от уведомлений о сообщениях" });
    } else if (existingSub && !existingSub.telegram_chat_id) {
      // Has subscription but no Telegram - need to link
      const token = crypto.randomUUID();
      await supabase.from("telegram_subscription_tokens").insert({
        user_id: currentUserId,
        email: existingSub.email,
        token,
        type: "messages",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      window.open(`https://t.me/dol_biz_bot?start=${token}`, "_blank");
      toast({ 
        title: "Перейдите в Telegram", 
        description: "Нажмите /start в боте для подтверждения" 
      });
    } else {
      // No subscription - create one
      const token = crypto.randomUUID();
      await supabase.from("telegram_subscription_tokens").insert({
        user_id: currentUserId,
        email: currentUserId,
        token,
        type: "messages",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      window.open(`https://t.me/dol_biz_bot?start=${token}`, "_blank");
      toast({ 
        title: "Перейдите в Telegram", 
        description: "Нажмите /start в боте для подтверждения" 
      });
    }
    
    setIsLoadingSubscription(false);
  };

  const loadMessages = async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .or(`to_id.eq.${currentUserId},from_id.eq.${currentUserId}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((messagesData || []).flatMap((m) => [m.from_id, m.to_id]))];

    let profilesMap: Record<string, { name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

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
    setLoading(false);
  };

  // Update unread counts
  useEffect(() => {
    const totalCount = messages.filter((m) => m.to_id === currentUserId && !m.is_read).length;
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

    messages
      .filter((m) => m.to_id === currentUserId && !m.is_read)
      .forEach((m) => {
        if (m.type in byType) {
          byType[m.type as MessageTypeFilter]++;
        }
      });

    setUnreadCountByType(byType);
  }, [messages, currentUserId]);

  // Group messages into reply chains
  const getConversationThreads = (): ConversationThread[] => {
    const nonDeletedMessages = messages.filter((m) => m.type !== "deleted");
    const filteredMessages =
      messageTypeFilter === "all" ? nonDeletedMessages : nonDeletedMessages.filter((m) => m.type === messageTypeFilter);

    const conversationMap = new Map<string, MessageWithSender[]>();

    filteredMessages.forEach((msg) => {
      const partnerId = msg.from_id === currentUserId ? msg.to_id : msg.from_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, []);
      }
      conversationMap.get(partnerId)!.push(msg);
    });

    return Array.from(conversationMap.entries())
      .map(([partnerId, msgs]) => {
        const sortedMsgs = msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const latestMsg = sortedMsgs[sortedMsgs.length - 1];
        const partnerProfile = msgs.find((m) => m.from_id === partnerId);

        const messageById = new Map(sortedMsgs.map((m) => [m.id, m]));
        const chains: MessageWithSender[][] = [];
        const assignedToChain = new Set<number>();

        const rootMessages = sortedMsgs.filter((m) => !m.reply_to || !messageById.has(m.reply_to));

        rootMessages.forEach((root) => {
          if (assignedToChain.has(root.id)) return;
          const chain: MessageWithSender[] = [root];
          assignedToChain.add(root.id);

          const findReplies = (parentId: number) => {
            sortedMsgs.forEach((m) => {
              if (m.reply_to === parentId && !assignedToChain.has(m.id)) {
                chain.push(m);
                assignedToChain.add(m.id);
                findReplies(m.id);
              }
            });
          };

          findReplies(root.id);
          chain.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          chains.push(chain);
        });

        sortedMsgs.forEach((m) => {
          if (!assignedToChain.has(m.id)) {
            chains.push([m]);
          }
        });

        chains.sort((a, b) => {
          // Сортируем по дате первого сообщения в цепочке (исходного)
          const aFirst = a[0];
          const bFirst = b[0];
          return new Date(aFirst.created_at).getTime() - new Date(bFirst.created_at).getTime();
        });

        return {
          partnerId,
          partnerName: partnerProfile?.senderName || "Неизвестный",
          partnerEmail: partnerProfile?.senderEmail || "",
          messages: sortedMsgs,
          chains,
          latestMessage: latestMsg,
        };
      })
      .sort((a, b) => new Date(a.latestMessage.created_at).getTime() - new Date(b.latestMessage.created_at).getTime());
  };

  const conversationThreads = getConversationThreads();

  // Mark all unread messages in a thread as read
  const markThreadAsRead = useCallback(
    async (thread: ConversationThread) => {
      const unreadMessages = thread.messages.filter((m) => m.to_id === currentUserId && !m.is_read);
      if (unreadMessages.length === 0) return;

      await supabase.from("messages").update({ is_read: true }).in("id", unreadMessages.map((m) => m.id));
      await loadMessages();
    },
    [currentUserId]
  );

  // Handle toggle message
  const handleToggleMessage = (thread: ConversationThread) => {
    if (expandedMessageId === thread.messages[0]?.id) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(thread.messages[0]?.id || null);
      markThreadAsRead(thread);
    }
  };

  // Handle send reply
  const handleSendReply = async (msg: MessageWithSender) => {
    const text = replyText[msg.id];
    if (!text?.trim() || !currentUserId) return;
    setIsSendingReply(true);

    const recipientId = msg.from_id === currentUserId ? msg.to_id : msg.from_id;

    const { error } = await supabase.from("messages").insert({
      from_id: currentUserId,
      to_id: recipientId,
      message: text.trim(),
      type: "chat" as const,
      reply_to: msg.id,
    });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    } else {
      toast({ title: "Ответ отправлен", description: "Сообщение отправлено" });
      await loadMessages();
    }

    setReplyText((prev) => ({ ...prev, [msg.id]: "" }));
    setReplyingToMessageId(null);
    setIsSendingReply(false);
  };

  // Handle delete messages
  const handleDeleteMessages = async () => {
    if (!deleteMessageConfirm) return;
    setDeletingMessages(true);

    const { error } = await supabase
      .from("messages")
      .update({ type: "deleted" as const })
      .in("id", deleteMessageConfirm.ids);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить сообщение(я)", variant: "destructive" });
    } else {
      toast({ title: "Удалено", description: "Сообщение(я) удалено(ы)" });
      await loadMessages();
    }

    setDeleteMessageConfirm(null);
    setDeletingMessages(false);
  };

  // Handle approve coin request
  const handleApproveCoinRequest = async (messageId: number, text: string) => {
    setApprovingCoinRequest(messageId);
    await supabase.from("messages").update({ is_read: true }).eq("id", messageId);
    await loadMessages();
    setApprovingCoinRequest(null);
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "exchange":
        return <span className="text-xs bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded">Обмен</span>;
      case "admin_status":
        return <span className="text-xs bg-yellow-500/10 text-yellow-700 px-2 py-0.5 rounded">Системное</span>;
      case "from_admin":
        return <span className="text-xs bg-red-500/10 text-red-700 px-2 py-0.5 rounded">Модератор</span>;
      case "income":
        return <span className="text-xs bg-green-500/10 text-green-700 px-2 py-0.5 rounded">Кошелёк</span>;
      case "chat":
        return <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Чат</span>;
      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (readTimerRef.current) {
        clearTimeout(readTimerRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Mark all unread messages as read after 3 seconds when filter changes
  useEffect(() => {
    if (readTimerRef.current) {
      clearTimeout(readTimerRef.current);
    }

    if (messages.length > 0) {
      const filterUnreadCount = unreadCountByType[messageTypeFilter] || 0;

      const totalUnread = messageTypeFilter === "all" ? unreadCount : filterUnreadCount;

      if (totalUnread > 0) {
        readTimerRef.current = setTimeout(async () => {
          const filteredMessages =
            messageTypeFilter === "all" ? messages : messages.filter((m) => m.type === messageTypeFilter);

          const unreadMessages = filteredMessages.filter((m) => m.to_id === currentUserId && !m.is_read);

          if (unreadMessages.length > 0) {
            await supabase.from("messages").update({ is_read: true }).in("id", unreadMessages.map((m) => m.id));
            await loadMessages();
          }
        }, 3000);
      }
    }

    return () => {
      if (readTimerRef.current) {
        clearTimeout(readTimerRef.current);
      }
    };
  }, [messageTypeFilter, messages, currentUserId, unreadCount, unreadCountByType]);

  // Render message content with images
  const renderMessageContent = (msg: MessageWithSender) => {
    const imageUrls = extractImageUrls(msg.message);
    const textWithoutUrls = imageUrls.reduce(
      (text, url) => text.replace(url, "").trim(),
      msg.message
    );

    return (
      <>
        <p className="text-sm whitespace-pre-wrap">{textWithoutUrls}</p>
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setFullImageUrl(url);
                }}
                className="block overflow-hidden rounded-lg border hover:opacity-80 transition-opacity"
              >
                <img
                  src={url}
                  alt="Вложение"
                  className="h-20 w-auto max-w-[150px] object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {msg.type === "coin_request" && userRoles.includes("super_admin") && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-700"
            onClick={(e) => {
              e.stopPropagation();
              handleApproveCoinRequest(msg.id, msg.message);
            }}
            disabled={approvingCoinRequest === msg.id}
          >
            <Check className="h-4 w-4 mr-1" />
            {approvingCoinRequest === msg.id ? "Обработка..." : "Одобрить"}
          </Button>
        )}
      </>
    );
  };

  return (
    <MainLayout>
      <div className="content-card">
        {/* Header with Back button */}
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Сообщения
            {messages.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({messages.length})</span>
            )}
          </h1>
          
          {/* Telegram subscription button */}
          <Button
            variant={isSubscribedToMessages ? "default" : "outline"}
            size="sm"
            onClick={handleToggleMessageSubscription}
            disabled={isLoadingSubscription}
          >
            {isSubscribedToMessages ? <Bell className="w-4 h-4 mr-1" /> : <BellOff className="w-4 h-4 mr-1" />}
            {isSubscribedToMessages ? "Уведомления вкл" : "Уведомления в Telegram"}
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border pb-2 mb-4">
          {(Object.keys(MESSAGE_TYPE_LABELS) as MessageTypeFilter[]).map((type) => {
            const count = unreadCountByType[type] || 0;
            return (
              <Button
                key={type}
                variant={messageTypeFilter === type ? "default" : "ghost"}
                size="sm"
                onClick={() => setMessageTypeFilter(type)}
                className="text-xs h-7 relative"
              >
                {MESSAGE_TYPE_LABELS[type]}
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3 pr-2">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : conversationThreads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Нет сообщений</p>
          ) : (
            conversationThreads.map((thread) => {
              const isExpanded = expandedMessageId === thread.messages[0]?.id;
              const latestPreview =
                thread.latestMessage.message.length > 60
                  ? thread.latestMessage.message.slice(0, 60) + "..."
                  : thread.latestMessage.message;

              return (
                <div
                  key={thread.partnerId}
                  className="border rounded-lg transition-colors border-border hover:border-primary/30"
                >
                  {/* Thread header */}
                  <button
                    onClick={() => handleToggleMessage(thread)}
                    className="w-full p-3 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">{thread.partnerName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(thread.latestMessage.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getTypeBadge(thread.latestMessage.type)}
                        <span className="text-xs text-muted-foreground">{thread.messages.length} сообщ.</span>
                      </div>
                      {!isExpanded && <p className="text-sm text-muted-foreground truncate mt-1">{latestPreview}</p>}
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
                    <div className="border-t border-border">
                      <div className="max-h-80 overflow-y-auto p-3 space-y-4">
                        {thread.chains.map((chain, chainIndex) => {
                          const myMessagesInChain = chain.filter((m) => m.from_id === currentUserId);
                          const canDeleteChain = myMessagesInChain.length > 0;

                          return (
                            <div key={chainIndex} className="space-y-2">
                              {chain.length > 1 && (
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <CornerDownRight className="h-3 w-3" />
                                    <span>Цепочка из {chain.length} сообщений</span>
                                  </div>
                                  {canDeleteChain && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteMessageConfirm({
                                          type: "chain",
                                          ids: myMessagesInChain.map((m) => m.id),
                                        });
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded border border-destructive/30 text-destructive/70 hover:bg-destructive/10 transition-colors text-xs"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Удалить цепочку</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {chain.map((msg) => {
                                const isFromMe = msg.from_id === currentUserId;
                                const isReplyTarget = replyingToMessageId === msg.id;
                                const parentMessage = msg.reply_to
                                  ? thread.messages.find((m) => m.id === msg.reply_to)
                                  : null;

                                return (
                                  <div key={msg.id} className="space-y-1">
                                    {parentMessage && (
                                      <div className={`flex ${isFromMe ? "justify-end" : "justify-start"} px-2`}>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[60%]">
                                          <CornerDownRight className="h-3 w-3 shrink-0" />
                                          <span>В ответ на: "{parentMessage.message.slice(0, 30)}..."</span>
                                        </div>
                                      </div>
                                    )}

                                    <div
                                      className={`flex ${isFromMe ? "justify-end" : "justify-start"} group`}
                                      ref={(el) => {
                                        if (el) {
                                          messageRefs.current.set(msg.id, el);
                                        } else {
                                          messageRefs.current.delete(msg.id);
                                        }
                                      }}
                                    >
                                      <div className="max-w-[80%] rounded-lg overflow-hidden">
                                        {/* Message header with buttons */}
                                        <div
                                          className={`flex items-center gap-2 px-3 py-2 ${
                                            isFromMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                          }`}
                                        >
                                          {getTypeBadge(msg.type)}
                                          <span
                                            className={`text-xs ${isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                                          >
                                            {new Date(msg.created_at).toLocaleString("ru-RU", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setReplyingToMessageId(isReplyTarget ? null : msg.id);
                                            }}
                                            className={`ml-auto p-2 rounded border transition-colors ${
                                              isFromMe
                                                ? "border-primary-foreground/30 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                            } ${isReplyTarget ? "bg-primary-foreground/10 border-primary" : ""}`}
                                          >
                                            <Reply className="h-4 w-4" />
                                          </button>
                                          {isFromMe && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteMessageConfirm({
                                                  type: "single",
                                                  ids: [msg.id],
                                                });
                                              }}
                                              className="p-2 rounded border border-destructive/30 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>

                                        {/* Message text with images */}
                                        <div className={`p-3 ${isFromMe ? "bg-primary/5" : "bg-background"}`}>
                                          {renderMessageContent(msg)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Inline reply input */}
                                    {isReplyTarget && (
                                      <div className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[80%] w-full space-y-1">
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                                            <Reply className="h-3 w-3" />
                                            <span>Ответ на сообщение</span>
                                          </div>
                                          <div className="flex gap-2">
                                            <Input
                                              placeholder="Введите ответ..."
                                              value={replyText[msg.id] || ""}
                                              onChange={(e) =>
                                                setReplyText((prev) => ({
                                                  ...prev,
                                                  [msg.id]: e.target.value,
                                                }))
                                              }
                                              className="flex-1 h-8 text-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                  e.preventDefault();
                                                  if (replyText[msg.id]?.trim()) {
                                                    handleSendReply(msg);
                                                  }
                                                }
                                                if (e.key === "Escape") {
                                                  setReplyingToMessageId(null);
                                                }
                                              }}
                                            />
                                            <Button
                                              size="sm"
                                              className="h-8"
                                              onClick={() => handleSendReply(msg)}
                                              disabled={isSendingReply || !replyText[msg.id]?.trim()}
                                            >
                                              <Send className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {chainIndex < thread.chains.length - 1 && (
                                <div className="border-t border-dashed border-border/50 my-3" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteMessageConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive mb-4">
                <Trash2 className="h-5 w-5" />
                Подтверждение удаления
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {deleteMessageConfirm.type === "chain"
                  ? `Вы уверены, что хотите удалить ${deleteMessageConfirm.ids.length} сообщений из этой цепочки?`
                  : "Вы уверены, что хотите удалить это сообщение?"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">Это действие нельзя отменить.</p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteMessageConfirm(null)}
                  disabled={deletingMessages}
                >
                  Отмена
                </Button>
                <Button variant="destructive" onClick={handleDeleteMessages} disabled={deletingMessages}>
                  {deletingMessages ? "Удаление..." : "Удалить"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Preview Dialog */}
        {fullImageUrl && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setFullImageUrl(null)}
          >
            <img
              src={fullImageUrl}
              alt="Полноразмерное изображение"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default Messenger;
