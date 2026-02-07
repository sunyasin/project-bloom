import { User, Wallet, MessageCircle, Pencil, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileFormData } from "../types/dashboard-types";

interface ProfileHeaderProps {
  formData: ProfileFormData;
  userRoles?: string[];
  unreadCount: number;
  exchangeCount: number;
  walletBalance: number;
  onOpenWallet: () => void;
  onOpenMessages: () => void;
  onOpenEdit: () => void;
  onOpenExchangeRequests: () => void;
}

export function ProfileHeader({
  formData,
  userRoles,
  unreadCount,
  exchangeCount,
  walletBalance,
  onOpenWallet,
  onOpenMessages,
  onOpenEdit,
  onOpenExchangeRequests,
}: ProfileHeaderProps) {
  return (
    <div className="content-card">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {formData.avatar ? (
              <img 
                src={formData.avatar} 
                alt={formData.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{formData.name}</h1>
            <p className="text-muted-foreground">{formData.email}</p>
            <span className="inline-block mt-1 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
              {userRoles?.[0] || "visitor"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onOpenExchangeRequests}>
            <Repeat className="h-4 w-4 mr-1" />
            Запросы на обмен{exchangeCount > 0 && ` (${exchangeCount})`}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenWallet}>
            <Wallet className="h-4 w-4 mr-1" />
            Кошелёк ({walletBalance})
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenMessages}>
            <MessageCircle className="h-4 w-4 mr-1" />
            Сообщения
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Редактировать
          </Button>
        </div>
      </div>
    </div>
  );
}
