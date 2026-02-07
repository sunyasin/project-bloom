// Utility functions for Dashboard

// ============= Image utilities =============

// Extract image URLs from message text
export const extractImageUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
  return text.match(urlRegex) || [];
};

// Validate image file
export const validateImage = (file: File): { valid: boolean; error: string | null } => {
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

// ============= Coin request utilities =============

// Parse coin_request message to extract profile ID and amount
export const parseCoinRequest = (
  message: string,
): { profileId: string | null; amount: number | null } => {
  const profileIdMatch = message.match(/ID профиля:\s*([a-f0-9-]+)/i);
  const amountMatch = message.match(/Сумма:\s*(\d+)/i);
  return {
    profileId: profileIdMatch ? profileIdMatch[1] : null,
    amount: amountMatch ? parseInt(amountMatch[1], 10) : null,
  };
};

// ============= Default images =============

export const DEFAULT_BUSINESS_IMAGE =
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop";
export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200&h=200&fit=crop";
export const DEFAULT_PROMO_IMAGE =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=200&fit=crop";

// ============= URL utilities =============

// Check if URL is from unsplash placeholder
export const isUnsplashUrl = (url: string): boolean => {
  return url.includes("unsplash.com");
};
