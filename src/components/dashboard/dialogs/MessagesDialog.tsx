import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import type {
  MessageWithSender,
  MessageTypeFilter,
  DeleteMessageConfirm,
  ConversationThread,
} from "../types/dashboard-types";
import { MESSAGE_TYPE_LABELS } from "../types/dashboard-types";
import { extractImageUrls } from "../utils/dashboard-utils";
import { supabase } from "@/integrations/supabase/client";

interface MessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: MessageWithSender[];
  loading: boolean;
  unreadCount: number;
  unreadCountByType: Record<MessageTypeFilter, number>;
  onLoadMessages: () => Promise<void>;
  onSendReply: (message: MessageWithSender, text: string) => Promise<void>;
  onDeleteMessages: (ids: number[]) => Promise<void>;
  onApproveCoinRequest?: (messageId: number, text: string) => Promise<void>;
  currentUserId: string;
  userRoles?: string[];
}

export function MessagesDialog({
  open,
  onOpenChange,
  messages,
  loading,
  unreadCount,
  unreadCountByType,
  onLoadMessages,
  onSendReply,
  onDeleteMessages,
  onApproveCoinRequest,
  currentUserId,
  userRoles,
}: MessagesDialogProps) {
  const [messageTypeFilter, setMessageTypeFilter] = useState<MessageTypeFilter>("all");
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyingToMessageId, setReplyingToMessageId] = useState<number | null>(null);
  const [deleteMessageConfirm, setDeleteMessageConfirm] = useState<DeleteMessageConfirm | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [approvingCoinRequest, setApprovingCoinRequest] = useState<number | null>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onLoadMessagesRef = useRef(onLoadMessages);
  
  // Keep ref updated with latest onLoadMessages
  useEffect(() => {
    onLoadMessagesRef.current = onLoadMessages;
  }, [onLoadMessages]);

  // Group messages into reply chains
  const getConversationThreads = (): ConversationThread[] => {
    // Filter out deleted messages first, then apply type filter
    const nonDeletedMessages = messages.filter((m) => m.type !== "deleted");
    const filteredMessages =
      messageTypeFilter === "all" ? nonDeletedMessages : nonDeletedMessages.filter((m) => m.type === messageTypeFilter);

    // Group by conversation partner
    const conversationMap = new Map<string, MessageWithSender[]>();

    filteredMessages.forEach((msg) => {
      const partnerId = msg.from_id === currentUserId ? msg.to_id : msg.from_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, []);
      }
      conversationMap.get(partnerId)!.push(msg);
    });

    // Convert to array and sort by latest message
    return Array.from(conversationMap.entries())
      .map(([partnerId, msgs]) => {
        const sortedMsgs = msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const latestMsg = sortedMsgs[sortedMsgs.length - 1];
        const partnerProfile = msgs.find((m) => m.from_id === partnerId);

        // Build reply chains
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
          const aLatest = a[a.length - 1];
          const bLatest = b[b.length - 1];
          return new Date(bLatest.created_at).getTime() - new Date(aLatest.created_at).getTime();
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
      .sort((a, b) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());
  };

  const conversationThreads = getConversationThreads();

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: number) => {
    await supabase.from("messages").update({ is_read: true }).eq("id", messageId);
    await onLoadMessagesRef.current();
  }, []);

  // Mark all unread messages in a thread as read
  const markThreadAsRead = useCallback(async (thread: ConversationThread) => {
    const unreadMessages = thread.messages.filter((m) => m.to_id === currentUserId && !m.is_read);
    if (unreadMessages.length === 0) return;
    
    await supabase.from("messages").update({ is_read: true }).in("id", unreadMessages.map(m => m.id));
    await onLoadMessagesRef.current();
  }, [currentUserId]);

  // Handle toggle message
  const handleToggleMessage = (thread: ConversationThread) => {
    if (expandedMessageId === thread.messages[0]?.id) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(thread.messages[0]?.id || null);
      // Mark all unread messages in thread as read
      markThreadAsRead(thread);
    }
  };

  // Handle send reply
  const handleSendReply = async (msg: MessageWithSender) => {
    const text = replyText[msg.id];
    if (!text?.trim()) return;
    setIsSendingReply(true);
    await onSendReply(msg, text);
    setReplyText((prev) => ({ ...prev, [msg.id]: "" }));
    setReplyingToMessageId(null);
    setIsSendingReply(false);
  };

  // Handle delete messages
  const handleDeleteMessages = async () => {
    if (!deleteMessageConfirm) return;
    setDeletingMessages(true);
    await onDeleteMessages(deleteMessageConfirm.ids);
    setDeleteMessageConfirm(null);
    setDeletingMessages(false);
  };

  // Handle approve coin request
  const handleApproveCoinRequest = async (messageId: number, text: string) => {
    if (!onApproveCoinRequest) return;
    setApprovingCoinRequest(messageId);
    await onApproveCoinRequest(messageId, text);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Сообщения
            {messages.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({messages.length})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border pb-2">
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

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
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
                                      className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
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
                                      <div
                                        className={`max-w-[80%] rounded-lg p-2 relative ${
                                          isFromMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
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
                                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                                              isFromMe
                                                ? "text-primary-foreground/70 hover:text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                            } ${isReplyTarget ? "bg-black/10" : ""}`}
                                          >
                                            <Reply className="h-3 w-3" />
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
                                              className="p-1 rounded hover:bg-destructive/20 text-primary-foreground/50 hover:text-destructive transition-colors"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>

                                        {/* Message text with images */}
                                        {(() => {
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
                                              {msg.type === "coin_request" && userRoles?.includes("super_admin") && (
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
                                        })()}
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
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteMessageConfirm} onOpenChange={(open) => !open && setDeleteMessageConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Подтверждение удаления
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {deleteMessageConfirm?.type === "chain"
                ? `Вы уверены, что хотите удалить ${deleteMessageConfirm.ids.length} сообщений из этой цепочки?`
                : "Вы уверены, что хотите удалить это сообщение?"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Это действие нельзя отменить.</p>
          </div>
          <div className="gap-2 flex">
            <Button variant="outline" onClick={() => setDeleteMessageConfirm(null)} disabled={deletingMessages}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessages} disabled={deletingMessages}>
              {deletingMessages ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Image Preview Dialog */}
      <Dialog open={!!fullImageUrl} onOpenChange={(open) => !open && setFullImageUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          {fullImageUrl && (
            <img
              src={fullImageUrl}
              alt="Полноразмерное изображение"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
