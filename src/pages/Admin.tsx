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
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type AdminRole = "super_admin";

// Only super_admin can access admin panel
const ADMIN_ROLES: AdminRole[] = ["super_admin"];

interface AdminMenuItem {
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
}

const adminMenu: AdminMenuItem[] = [
  { label: "Дашборд", icon: LayoutDashboard, roles: ["super_admin"] },
  { label: "Пользователи", icon: Users, roles: ["super_admin"] },
  { label: "Производители", icon: Building2, roles: ["super_admin"] },
  { label: "Акции", icon: Tag, roles: ["super_admin"] },
  { label: "Заявки", icon: FileText, roles: ["super_admin"] },
  { label: "Новости", icon: Newspaper, roles: ["super_admin"] },
  { label: "Коины", icon: Coins, roles: ["super_admin"] },
  { label: "Роли и права", icon: Shield, roles: ["super_admin"] },
  { label: "Настройки", icon: Settings, roles: ["super_admin"] },
];

// Available roles for assignment
const AVAILABLE_ROLES = [
  { value: "visitor", label: "Посетитель" },
  { value: "client", label: "Клиент" },
  { value: "moderator", label: "Модератор" },
  { value: "news_editor", label: "Редактор новостей" },
  { value: "super_admin", label: "Суперадмин" },
] as const;

// Roles Management Section Component
const RolesManagementSection = () => {
  const { toast } = useToast();
  
  interface UserWithRoleData {
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    role_id: string;
  }
  
  const [users, setUsers] = useState<UserWithRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadUsersWithRoles = async () => {
    setLoading(true);
    
    // Get all user_roles with profile info
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role");
    
    if (rolesError) {
      console.error("Error loading roles:", rolesError);
      setLoading(false);
      return;
    }

    // Get profiles for names
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name");

    // Merge data
    const merged = rolesData.map((role) => {
      const profile = profilesData?.find((p) => p.user_id === role.user_id);
      return {
        user_id: role.user_id,
        email: profile?.email || "—",
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        role: role.role,
        role_id: role.id,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  const handleRoleChange = async (userId: string, roleId: string, newRole: string) => {
    setUpdating(userId);
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "visitor" | "client" | "moderator" | "news_editor" | "super_admin" })
      .eq("id", roleId);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Роль обновлена",
        description: `Новая роль: ${AVAILABLE_ROLES.find(r => r.value === newRole)?.label}`,
      });
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      );
    }
    
    setUpdating(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "moderator":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "news_editor":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "client":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Управление ролями пользователей</h2>
          <Button variant="outline" size="sm" onClick={loadUsersWithRoles} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Обновить
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Загрузка...</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Нет пользователей</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Текущая роль</TableHead>
                  <TableHead className="w-[200px]">Изменить роль</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : "Без имени"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium border",
                        getRoleBadgeColor(user.role)
                      )}>
                        {AVAILABLE_ROLES.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.user_id, user.role_id, value)}
                        disabled={updating === user.user_id}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

// Coin Exchange Section Component
const CoinExchangeSection = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<{ user_id: string; id: string; name: string; wallet: number }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isRubToCoin, setIsRubToCoin] = useState(true);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultHash, setResultHash] = useState<string | null>(null);

  // Coins history
  interface CoinRecord {
    id: string;
    id_text: string;
    when: string;
    amount: number;
    who: string;
    profile_balance: number;
    total_balance: number;
    hash: string;
  }
  const [coins, setCoins] = useState<CoinRecord[]>([]);
  const [coinsLoading, setCoinsLoading] = useState(false);

  // Verification state
  type VerificationStatus = "pending" | "valid" | "invalid" | "error";
  interface VerificationResult {
    coinId: string;
    status: VerificationStatus;
    decoded?: string;
    error?: string;
  }
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({});
  const [verifying, setVerifying] = useState(false);
  const [verificationSummary, setVerificationSummary] = useState<{ total: number; valid: number; invalid: number; errors: number } | null>(null);

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, wallet");
    
    if (data) {
      setProfiles(
        data.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
          wallet: p.wallet || 0,
        }))
      );
    }
  };

  const loadCoins = async () => {
    setCoinsLoading(true);
    const { data } = await supabase
      .from("coins")
      .select("*")
      .order("when", { ascending: false })
      .limit(100);
    
    if (data) {
      setCoins(data as CoinRecord[]);
    }
    setCoinsLoading(false);
  };

  // Verify all coin hashes in the chain
  const verifyChain = async () => {
    setVerifying(true);
    setVerificationResults({});
    setVerificationSummary(null);

    // Load ALL coins ordered by time ascending for chain verification
    const { data: allCoins } = await supabase
      .from("coins")
      .select("*")
      .order("when", { ascending: true });

    if (!allCoins || allCoins.length === 0) {
      toast({ title: "Нет данных", description: "Таблица coins пуста", variant: "destructive" });
      setVerifying(false);
      return;
    }

    const results: Record<string, VerificationResult> = {};
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allCoins.length; i++) {
      const coin = allCoins[i] as CoinRecord;
      
      try {
        // Call decode_coin_hash to decrypt
        const { data: decoded, error } = await supabase.rpc("decode_coin_hash", {
          p_hash_text: coin.hash,
        });

        if (error) {
          results[coin.id] = { coinId: coin.id, status: "error", error: error.message };
          errorCount++;
          continue;
        }

        // Parse decoded string: DD.MM.YYYY_HH24:MI:SS.MS_amount_profile_balance_total_balance_user_id
        const parts = (decoded as string).split("_");
        if (parts.length < 6) {
          results[coin.id] = { coinId: coin.id, status: "invalid", decoded, error: "Неверный формат" };
          invalidCount++;
          continue;
        }

        // Extract values from decoded string
        const decodedAmount = parseInt(parts[2], 10);
        const decodedProfileBalance = parseInt(parts[3], 10);
        const decodedTotalBalance = parseInt(parts[4], 10);
        const decodedUserId = parts.slice(5).join("_"); // UUID may have been split

        // Find profile by user_id to compare with coin.who (which is profile.id)
        const matchingProfile = profiles.find((p) => p.user_id === decodedUserId);

        // Validate values
        const isAmountValid = decodedAmount === coin.amount;
        const isProfileBalanceValid = decodedProfileBalance === coin.profile_balance;
        const isTotalBalanceValid = decodedTotalBalance === coin.total_balance;
        const isUserValid = matchingProfile ? matchingProfile.id === coin.who : false;

        if (isAmountValid && isProfileBalanceValid && isTotalBalanceValid && isUserValid) {
          results[coin.id] = { coinId: coin.id, status: "valid", decoded };
          validCount++;
        } else {
          const errors: string[] = [];
          if (!isAmountValid) errors.push(`сумма: ${decodedAmount}≠${coin.amount}`);
          if (!isProfileBalanceValid) errors.push(`баланс: ${decodedProfileBalance}≠${coin.profile_balance}`);
          if (!isTotalBalanceValid) errors.push(`общий: ${decodedTotalBalance}≠${coin.total_balance}`);
          if (!isUserValid) errors.push(`пользователь не совпадает`);
          
          results[coin.id] = { 
            coinId: coin.id, 
            status: "invalid", 
            decoded, 
            error: errors.join(", ") 
          };
          invalidCount++;
        }
      } catch (err) {
        results[coin.id] = { coinId: coin.id, status: "error", error: "Ошибка декодирования" };
        errorCount++;
      }
    }

    setVerificationResults(results);
    setVerificationSummary({
      total: allCoins.length,
      valid: validCount,
      invalid: invalidCount,
      errors: errorCount,
    });
    setVerifying(false);

    if (invalidCount === 0 && errorCount === 0) {
      toast({ title: "Верификация успешна", description: `Все ${validCount} записей прошли проверку` });
    } else {
      toast({ 
        title: "Обнаружены проблемы", 
        description: `Валидных: ${validCount}, невалидных: ${invalidCount}, ошибок: ${errorCount}`,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadProfiles();
    loadCoins();
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
        // Refresh profiles and coins
        const { data: refreshed } = await supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, wallet");
        if (refreshed) {
          setProfiles(
            refreshed.map((p) => ({
              id: p.id,
              user_id: p.user_id,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
              wallet: p.wallet || 0,
            }))
          );
        }
        loadCoins();
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

      {/* Coins History Table */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">История операций с коинами</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={verifyChain} 
              disabled={verifying || coinsLoading}
            >
              <ShieldCheck className={cn("h-4 w-4 mr-1", verifying && "animate-pulse")} />
              {verifying ? "Проверка..." : "Верифицировать"}
            </Button>
            <Button variant="outline" size="sm" onClick={loadCoins} disabled={coinsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", coinsLoading && "animate-spin")} />
              Обновить
            </Button>
          </div>
        </div>

        {/* Verification Summary */}
        {verificationSummary && (
          <div className={cn(
            "p-3 rounded-lg mb-4 flex items-center gap-4",
            verificationSummary.invalid === 0 && verificationSummary.errors === 0
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          )}>
            {verificationSummary.invalid === 0 && verificationSummary.errors === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {verificationSummary.invalid === 0 && verificationSummary.errors === 0
                  ? "Цепочка верифицирована успешно"
                  : "Обнаружены проблемы в цепочке"}
              </p>
              <p className="text-sm text-muted-foreground">
                Всего: {verificationSummary.total} | 
                Валидных: <span className="text-green-600">{verificationSummary.valid}</span> | 
                Невалидных: <span className="text-red-600">{verificationSummary.invalid}</span> | 
                Ошибок: <span className="text-orange-600">{verificationSummary.errors}</span>
              </p>
            </div>
          </div>
        )}

        {coinsLoading ? (
          <p className="text-muted-foreground text-center py-8">Загрузка...</p>
        ) : coins.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Нет записей</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Статус</TableHead>
                  <TableHead className="w-[140px]">Дата</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Баланс</TableHead>
                  <TableHead className="text-right">Общий</TableHead>
                  <TableHead className="w-[200px]">Хеш</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coins.map((coin) => {
                  const profile = profiles.find((p) => p.id === coin.who);
                  const verification = verificationResults[coin.id];
                  
                  return (
                    <TableRow key={coin.id} className={cn(
                      verification?.status === "invalid" && "bg-red-500/5",
                      verification?.status === "error" && "bg-orange-500/5"
                    )}>
                      <TableCell>
                        {verification ? (
                          <div title={verification.error || verification.decoded || ""}>
                            {verification.status === "valid" && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {verification.status === "invalid" && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {verification.status === "error" && (
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(coin.when).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profile?.name || coin.who.slice(0, 8) + "..."}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        coin.amount > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {coin.amount > 0 ? "+" : ""}{coin.amount}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {coin.profile_balance}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {coin.total_balance}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={coin.hash}>
                        {coin.hash.slice(0, 20)}...
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

const AdminContent = () => {
  const [activeSection, setActiveSection] = useState("Дашборд");
  const { user } = useCurrentUserWithRole();
  
  // Get user role
  const userRole = user?.role;

  const availableMenu = adminMenu.filter((item) => 
    userRole && item.roles.includes(userRole as AdminRole)
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Коины":
        return <CoinExchangeSection />;
      case "Роли и права":
        return <RolesManagementSection />;
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
              <p className="text-xs text-muted-foreground">Суперадмин</p>
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
