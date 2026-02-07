// =============================================
// TypeScript-типы для таблиц Supabase
// =============================================

/** Пользователь (auth.users → public.profiles) */
export interface User {
  id: string;
  email: string;
  role: 'user' | 'producer' | 'admin';
  created_at: string;
  updated_at: string;
}

/** Профиль производителя */
export interface ProducerProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  social_links: Record<string, string> | null;
  extra_contacts: Record<string, unknown> | null;
  gps_lat: number | null;
  gps_lng: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Категория товаров */
export interface Category {
  id: string;
  name: string;
  icon: string;
  image_url: string | null;
  count: number;
  position: number;
  is_hidden: boolean;
  cities: string[] | null;
  created_at: string;
}

/** Статусы визитки */
export type BusinessStatus = 'draft' | 'moderation' | 'published' | 'deleted';

/** Бизнес / визитка */
export interface Business {
  id: string;
  owner_id: string | null;
  category_id: string | null;
  name: string;
  category: string;
  location: string;
  city: string;
  content_json: Record<string, unknown>;
  status: BusinessStatus;
  donation_30d: number;
  created_at: string;
  updated_at: string;
}

/** Товар */
export interface Product {
  id: string;
  producer_id: string;
  business_card_id: string | null; // Если null - товар показывается на всех визитках
  name: string;
  description: string | null;
  content: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  category_id: string | null;
  is_available: boolean;
  sale_type: 'sell_only' | 'barter_goods' | 'barter_coin';
  created_at: string;
  updated_at: string;
}

/** Акция */
export interface Promotion {
  id: string;
  owner_id: string;
  business_id: string;
  title: string;
  description: string | null;
  discount: string;
  image_url: string | null;
  valid_until: string | null;
  is_active: boolean;
  donation: number;
  created_at: string;
  updated_at: string;
}

/** Новость */
export interface News {
  id: string;
  author_id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Событие / мероприятие */
export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  event_date: string;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** Сообщение в чате */
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/** Лог модерации */
export interface ModerationLog {
  id: string;
  admin_id: string;
  target_type: 'user' | 'producer' | 'product' | 'news' | 'event';
  target_id: string;
  action: 'approve' | 'reject' | 'ban' | 'unban' | 'delete';
  reason: string | null;
  created_at: string;
}

/** Подписка пользователя */
export interface Subscription {
  id: string;
  user_id: string;
  producer_id: string;
  created_at: string;
}
