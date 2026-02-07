# Dashboard Refactoring Plan

## Overview

Файл `Dashboard.tsx` содержит **3252 строки** и объединяет 7 крупных функциональных областей. Цель - разбить на переиспользуемые компоненты.

## Current State Analysis

### Functional Blocks in Dashboard.tsx

| # | Block | Lines | Description |
|---|-------|-------|-------------|
| 1 | Imports & Constants | 1-135 | Imports, utility functions, constants |
| 2 | Types & Interfaces | 138-213 | Message types, Profile types, Transaction types |
| 3 | Profile Section | 215-652 | Profile state, handlers, dialog |
| 4 | Promotions Section | 653-766 | Promotions state, handlers, dialog |
| 5 | News Section | 768-2359 | News state, handlers, dialog, list |
| 6 | Messages Section | 811-2767 | Messages state, handlers, dialog (350+ lines) |
| 7 | Wallet Section | 1189-3230 | Wallet state, handlers, dialogs (500+ lines) |
| 8 | Main Render | 1643-3250 | UI rendering + all dialogs inline |

---

## Proposed Structure

```
src/components/dashboard/
├── types/
│   └── dashboard-types.ts          # All interfaces
├── utils/
│   └── dashboard-utils.ts          # Utility functions
├── sections/
│   ├── ProfileHeader.tsx            # Profile card header
│   ├── BusinessCardsSection.tsx     # Business cards grid
│   ├── ProductsSection.tsx         # Products grid
│   ├── PromotionsSection.tsx       # Promotions grid
│   └── NewsSection.tsx             # News list
└── dialogs/
    ├── EditProfileDialog.tsx       # Profile edit form
    ├── PromotionDialog.tsx         # Promotion create/edit form
    ├── NewsDialog.tsx              # News create/edit form
    ├── MessagesDialog.tsx          # Full messages interface
    ├── WalletDialog.tsx            # Wallet with transfers
    ├── TransactionsDialog.tsx     # Transaction history
    └── HashDecodeDialog.tsx        # Hash decoder
```

---

## Detailed Component Specs

### 1. `dashboard-types.ts` (~80 lines)

```typescript
// Messages
export interface MessageWithSender { id, from_id, to_id, message, type, is_read, created_at, senderName, senderEmail, reply_to }
export type MessageTypeFilter = "all" | "admin_status" | "from_admin" | "chat" | "exchange" | "income" | "coin_request" | "order"
export const MESSAGE_TYPE_LABELS: Record<MessageTypeFilter, string>

// Profile
export interface ProfileData { first_name, last_name, email, phone, city, address, gps_lat, gps_lng, logo_url }
export interface ProfileFormData { name, email, phone, city, address, lat, lng, avatar, telegram, vk, instagram }

// Transactions
export type TransactionViewMode = "transfers" | "exchanges"
export interface TransactionHistoryItem { id, type, amount, date, counterparty, balance_after, hash }

// Wallet
export type WalletMode = "transfer" | "receive"
export interface UserOption { id, string }
```

### 2. `dashboard-utils.ts` (~50 lines)

```typescript
export const extractImageUrls(text: string): string[]
export const parseCoinRequest(message: string): { profileId: string | null, amount: number | null }
export const validateImage(file: File): { valid: boolean, error: string | null }
export const DEFAULT_BUSINESS_IMAGE: string
export const DEFAULT_PRODUCT_IMAGE: string
export const DEFAULT_PROMO_IMAGE: string
```

### 3. `MessagesDialog.tsx` (~350 lines)

**Props:**
```typescript
interface MessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: MessageWithSender[]
  loading: boolean
  unreadCount: number
  unreadCountByType: Record<MessageTypeFilter, number>
  onLoadMessages: () => Promise<void>
  onSendReply: (message: MessageWithSender, text: string) => Promise<void>
  onDeleteMessages: (ids: number[]) => Promise<void>
  onApproveCoinRequest?: (messageId: number, text: string) => Promise<void>
  currentUserId: string
  userRoles?: string[]
}
```

**Internal State:**
- `expandedMessageId: number | null`
- `replyText: Record<number, string>`
- `replyingToMessageId: number | null`
- `deleteMessageConfirm: DeleteMessageConfirm | null`
- `fullImageUrl: string | null`

### 4. `WalletDialog.tsx` (~220 lines)

**Props:**
```typescript
interface WalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: number
  profileId: string | null
  allUsers: UserOption[]
}
```

**Sub-components:**
- TransferForm
- ReceiveForm
- TransactionHistory (inline)

### 5. `EditProfileDialog.tsx` (~230 lines)

**Props:**
```typescript
interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: ProfileFormData
  onSave: (data: ProfileFormData) => Promise<void>
  userRoles?: string[]
}
```

### 6. `PromotionDialog.tsx` (~140 lines)

**Props:**
```typescript
interface PromotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: PromotionFormData
  businesses: Business[]
  onSave: (data: PromotionFormData) => Promise<void>
}
```

### 7. `NewsDialog.tsx` (~70 lines)

**Props:**
```typescript
interface NewsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: NewsFormData
  onSave: (data: NewsFormData) => Promise<void>
}
```

---

## Migration Steps

### Phase 1: Foundation
1. Create `src/components/dashboard/types/dashboard-types.ts`
2. Create `src/components/dashboard/utils/dashboard-utils.ts`
3. Update imports in Dashboard.tsx

### Phase 2: Large Dialogs
3. Extract `MessagesDialog.tsx`
4. Extract `WalletDialog.tsx` (includes Transactions sub-dialog)
5. Extract `HashDecodeDialog.tsx`

### Phase 3: Form Dialogs
6. Extract `EditProfileDialog.tsx`
7. Extract `PromotionDialog.tsx`
8. Extract `NewsDialog.tsx`

### Phase 4: Section Components
9. Extract `ProfileHeader.tsx`
10. Extract `BusinessCardsSection.tsx`
11. Extract `ProductsSection.tsx`
12. Extract `PromotionsSection.tsx`
13. Extract `NewsSection.tsx`

### Phase 5: Final Cleanup
14. Update Dashboard.tsx to use all extracted components
15. Remove unused inline code
16. Verify all imports and exports

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Dashboard.tsx lines | 3252 | ~300 |
| Largest component | 3252 | ~350 |
| Reusable components | 0 | 12 |
| Single responsibility | ❌ | ✅ |
| Testability | Hard | Easy |

---

## Key Considerations

1. **Callback Patterns**: Use consistent callback props for CRUD operations
2. **State Management**: Keep state in parent (Dashboard) or local if UI-only
3. **Shared Dependencies**: All components can use `src/hooks/*` and `src/ui/*`
4. **Type Safety**: All new components must use the shared types
5. **No Breaking Changes**: Original functionality preserved
