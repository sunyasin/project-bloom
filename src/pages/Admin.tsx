import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Tag, 
  FileText, 
  Newspaper,
  Settings,
  Shield,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type AdminRole = "moderator" | "news_editor" | "super_admin";

// Map app roles to admin menu roles
const ADMIN_ROLES: AdminRole[] = ["moderator", "news_editor", "super_admin"];

interface AdminMenuItem {
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
}

const adminMenu: AdminMenuItem[] = [
  { label: "Дашборд", icon: LayoutDashboard, roles: ["moderator", "news_editor", "super_admin"] },
  { label: "Пользователи", icon: Users, roles: ["super_admin"] },
  { label: "Производители", icon: Building2, roles: ["moderator", "super_admin"] },
  { label: "Акции", icon: Tag, roles: ["moderator", "super_admin"] },
  { label: "Заявки", icon: FileText, roles: ["moderator", "super_admin"] },
  { label: "Новости", icon: Newspaper, roles: ["news_editor", "super_admin"] },
  { label: "Коины", icon: Coins, roles: ["super_admin"] },
  { label: "Роли и права", icon: Shield, roles: ["super_admin"] },
  { label: "Настройки", icon: Settings, roles: ["super_admin"] },
];

// Coin Exchange Section Component
const CoinExchangeSection = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<{ user_id: string; name: string; wallet: number }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isRubToCoin, setIsRubToCoin] = useState(true);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultHash, setResultHash] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, wallet");
      
      if (data) {
        setProfiles(
          data.map((p) => ({
            user_id: p.user_id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
            wallet: p.wallet || 0,
          }))
        );
      }
    };
    loadProfiles();
  }, []);

  const handleExchange = async () => {
    if (!selectedUserId) {
      toast({ title: "Ошибка", description: "Выберите пользователя", variant: "destructive" });
      return;
    }
    const sum = parseInt(amount, 10);
    if (!sum || sum <= 0) {
      toast({ title: "Ошибка", description: "Введите корректную сумму", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResultHash(null);

    try {
      const { data, error } = await supabase.rpc("coin_exchange", {
        p_initiator: selectedUserId,
        is_r2c: isRubToCoin,
        p_sum: sum,
      });

      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        setResultHash(data);
        toast({
          title: "Успешно",
          description: isRubToCoin
            ? `Начислено ${sum} коинов`
            : `Списано ${sum} коинов`,
        });
        setAmount("");
        // Refresh profiles to update wallet balance
        const { data: refreshed } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, wallet");
        if (refreshed) {
          setProfiles(
            refreshed.map((p) => ({
              user_id: p.user_id,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
              wallet: p.wallet || 0,
            }))
          );
        }
      }
    } catch (err) {
      toast({ title: "Ошибка", description: "Не удалось выполнить операцию", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.user_id === selectedUserId);

  return (
    <div className="space-y-6">
      <div className="content-card">
        <h2 className="text-lg font-semibold mb-4">Обмен рублей ↔ коинов</h2>
        
        <div className="space-y-4 max-w-md">
          {/* User selector */}
          <div className="space-y-2">
            <Label>Пользователь</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.name} (баланс: {p.wallet})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProfile && (
              <p className="text-sm text-muted-foreground">
                Текущий баланс: <span className="font-medium">{selectedProfile.wallet}</span> коинов
              </p>
            )}
          </div>

          {/* Direction toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">
                {isRubToCoin ? "Рубли → Коины" : "Коины → Рубли"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRubToCoin ? "Начисление коинов" : "Списание коинов"}
              </p>
            </div>
            <Switch
              checked={isRubToCoin}
              onCheckedChange={setIsRubToCoin}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Сумма</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Введите сумму"
            />
          </div>

          {/* Submit */}
          <Button onClick={handleExchange} disabled={loading} className="w-full">
            {loading ? "Выполнение..." : isRubToCoin ? "Начислить коины" : "Списать коины"}
          </Button>

          {/* Result hash */}
          {resultHash && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-700 mb-1">Хеш операции:</p>
              <p className="text-xs font-mono break-all">{resultHash}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminContent = () => {
  const [activeSection, setActiveSection] = useState("Дашборд");
  const { user } = useCurrentUserWithRole();
  
  // Get user role, default to moderator for menu filtering
  const userRole = (user?.role as AdminRole) || "moderator";

  const availableMenu = adminMenu.filter((item) => item.roles.includes(userRole));

  const renderContent = () => {
    switch (activeSection) {
      case "Коины":
        return <CoinExchangeSection />;
      default:
        return (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-16">
              Контент раздела «{activeSection}» будет здесь
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-card border-r border-border shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Админ-панель</p>
              <p className="text-xs text-muted-foreground">
                {userRole === "super_admin" && "Суперадмин"}
                {userRole === "moderator" && "Модератор"}
                {userRole === "news_editor" && "Редактор новостей"}
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {availableMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.label;
            
            return (
              <button
                key={item.label}
                onClick={() => setActiveSection(item.label)}
                className={cn(
                  "w-full nav-link",
                  isActive && "active"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{activeSection}</h1>
            <p className="text-muted-foreground mt-1">
              Управление разделом «{activeSection}»
            </p>
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const Admin = () => {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <AdminContent />
    </RoleGuard>
  );
};

export default Admin;
