// Types for Dashboard and related components

// ============= Messages types =============

export interface MessageWithSender {
  id: number;
  from_id: string;
  to_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  senderName: string;
  senderEmail: string;
  reply_to: number | null;
}

export type MessageTypeFilter =
  | "all"
  | "admin_status"
  | "from_admin"
  | "chat"
  | "exchange"
  | "income"
  | "coin_request"
  | "order";

export const MESSAGE_TYPE_LABELS: Record<MessageTypeFilter, string> = {
  all: "Все",
  admin_status: "Системные",
  from_admin: "От модератора",
  chat: "Чат",
  exchange: "Обмен",
  income: "Кошелёк",
  coin_request: "Запросы койнов",
  order: "Заказы",
};

// ============= Profile types =============

export interface ProfileData {
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

export interface ProfileFormData {
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

// ============= Transaction types =============

export type TransactionViewMode = "transfers" | "exchanges";

export interface TransactionHistoryItem {
  id: string;
  type: "transfer_out" | "transfer_in" | "coin_exchange";
  amount: number;
  date: string;
  counterparty?: string;
  balance_after?: number;
  hash?: string;
}

// ============= Wallet types =============

export type WalletMode = "transfer" | "receive";

export interface UserOption {
  id: string;
  name: string;
}

// ============= Delete confirmation types =============

export interface DeleteMessageConfirm {
  type: "single" | "chain";
  ids: number[];
}

// ============= Conversation thread types =============

export interface ConversationThread {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  messages: MessageWithSender[];
  chains: MessageWithSender[][];
  latestMessage: MessageWithSender;
}
