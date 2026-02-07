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
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import AdminNews from "./AdminNews";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AdminRole = "super_admin" | "news_editor";

// Only super_admin and news_editor can access admin panel
const ADMIN_ROLES: AdminRole[] = ["super_admin", "news_editor"];

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
  { label: "Новости", icon: Newspaper, roles: ["super_admin", "news_editor"] },
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

  interface RoleRecord {
    role: string;
    role_id: string;
  }

  interface UserWithRolesData {
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    roles: RoleRecord[];
  }

  interface ProfileData {
    user_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  }

  const [users, setUsers] = useState<UserWithRolesData[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Add new role state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newSelectedUserId, setNewSelectedUserId] = useState("");
  const [newSelectedRole, setNewSelectedRole] = useState("client");
  const [addingRole, setAddingRole] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ userId: string; roleId: string; role: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsersWithRoles = async () => {
    setLoading(true);

    // Get all user_roles with profile info
    const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("id, user_id, role");

    if (rolesError) {
      console.error("Error loading roles:", rolesError);
      setLoading(false);
      return;
    }

    // Get profiles for names
    const { data: profilesData } = await supabase.from("profiles").select("user_id, email, first_name, last_name");

    if (profilesData) {
      setAllProfiles(profilesData);
    }

    // Group roles by user_id
    const groupedByUser: Record<string, RoleRecord[]> = {};
    rolesData.forEach((role) => {
      if (!groupedByUser[role.user_id]) {
        groupedByUser[role.user_id] = [];
      }
      groupedByUser[role.user_id].push({ role: role.role, role_id: role.id });
    });

    // Merge with profile data
    const merged: UserWithRolesData[] = Object.entries(groupedByUser).map(([userId, roles]) => {
      const profile = profilesData?.find((p) => p.user_id === userId);
      return {
        user_id: userId,
        email: profile?.email || "—",
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        roles,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  // Get available roles for a user (roles they don't already have)
  const getAvailableRolesForUser = (userId: string) => {
    const user = users.find((u) => u.user_id === userId);
    const existingRoles = user?.roles.map((r) => r.role) || [];
    return AVAILABLE_ROLES.filter((r) => !existingRoles.includes(r.value));
  };

  const handleAddRole = async () => {
    if (!newSelectedUserId) {
      toast({ title: "Ошибка", description: "Выберите пользователя", variant: "destructive" });
      return;
    }

    // Check if user already has this role
    const user = users.find((u) => u.user_id === newSelectedUserId);
    if (user?.roles.some((r) => r.role === newSelectedRole)) {
      toast({ title: "Ошибка", description: "У пользователя уже есть эта роль", variant: "destructive" });
      return;
    }

    setAddingRole(true);

    const { error } = await supabase.from("user_roles").insert({
      user_id: newSelectedUserId,
      role: newSelectedRole as "visitor" | "client" | "moderator" | "news_editor" | "super_admin",
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Роль добавлена",
        description: `Пользователю назначена роль ${AVAILABLE_ROLES.find((r) => r.value === newSelectedRole)?.label}`,
      });
      setIsAddingNew(false);
      setNewSelectedUserId("");
      setNewSelectedRole("client");
      loadUsersWithRoles();
    }

    setAddingRole(false);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setDeleting(true);

    const { error } = await supabase.from("user_roles").delete().eq("id", roleToDelete.roleId);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Роль удалена", 
        description: `Роль "${AVAILABLE_ROLES.find((r) => r.value === roleToDelete.role)?.label}" удалена у ${roleToDelete.email}` 
      });
      loadUsersWithRoles();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setRoleToDelete(null);
  };

  const cancelAddNew = () => {
    setIsAddingNew(false);
    setNewSelectedUserId("");
    setNewSelectedRole("client");
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

  const getSelectedUserLabel = () => {
    const profile = allProfiles.find((p) => p.user_id === newSelectedUserId);
    if (!profile) return "Выберите пользователя...";
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return name || profile.email || "Без имени";
  };

  return (
    <div className="space-y-6">
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Управление ролями пользователей</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => setIsAddingNew(true)} disabled={isAddingNew}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить роль
            </Button>
            <Button variant="outline" size="sm" onClick={loadUsersWithRoles} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Обновить
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Загрузка...</p>
        ) : users.length === 0 && !isAddingNew ? (
          <p className="text-muted-foreground text-center py-8">Нет пользователей с ролями</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New row for adding */}
                {isAddingNew && (
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2}>
                      <Popover open={newUserOpen} onOpenChange={setNewUserOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={newUserOpen}
                            className="w-full justify-between"
                          >
                            {getSelectedUserLabel()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Поиск пользователя..." />
                            <CommandList>
                              <CommandEmpty>Пользователи не найдены</CommandEmpty>
                              <CommandGroup>
                                {allProfiles.map((profile) => {
                                  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
                                  return (
                                    <CommandItem
                                      key={profile.user_id}
                                      value={`${name} ${profile.email}`}
                                      onSelect={() => {
                                        setNewSelectedUserId(profile.user_id);
                                        setNewUserOpen(false);
                                        // Reset role selection to first available
                                        const available = getAvailableRolesForUser(profile.user_id);
                                        if (available.length > 0) {
                                          setNewSelectedRole(available[0].value);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          newSelectedUserId === profile.user_id ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{name || "Без имени"}</span>
                                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={newSelectedRole} 
                        onValueChange={setNewSelectedRole}
                        disabled={!newSelectedUserId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          {(newSelectedUserId ? getAvailableRolesForUser(newSelectedUserId) : AVAILABLE_ROLES).map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleAddRole}
                          disabled={addingRole || !newSelectedUserId || !newSelectedRole}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelAddNew} disabled={addingRole}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : "Без имени"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((roleRecord) => (
                          <span
                            key={roleRecord.role_id}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border",
                              getRoleBadgeColor(roleRecord.role)
                            )}
                          >
                            {AVAILABLE_ROLES.find((r) => r.value === roleRecord.role)?.label || roleRecord.role}
                            <button
                              onClick={() => {
                                setRoleToDelete({
                                  userId: user.user_id,
                                  roleId: roleRecord.role_id,
                                  role: roleRecord.role,
                                  email: user.email,
                                });
                                setDeleteConfirmOpen(true);
                              }}
                              className="ml-1 hover:text-destructive transition-colors"
                              title="Удалить роль"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getAvailableRolesForUser(user.user_id).length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewSelectedUserId(user.user_id);
                            const available = getAvailableRolesForUser(user.user_id);
                            if (available.length > 0) {
                              setNewSelectedRole(available[0].value);
                            }
                            setIsAddingNew(true);
                          }}
                          title="Добавить ещё роль"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить роль?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить роль{" "}
              <strong>{AVAILABLE_ROLES.find((r) => r.value === roleToDelete?.role)?.label}</strong>{" "}
              у пользователя <strong>{roleToDelete?.email}</strong>? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  // Journal dialog
  const [showJournal, setShowJournal] = useState(false);

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("__all__");
  const [amountOperator, setAmountOperator] = useState<string>("__none__");
  const [amountValue, setAmountValue] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

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
  const [verificationSummary, setVerificationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    errors: number;
  } | null>(null);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, first_name, last_name, wallet");

    if (data) {
      setProfiles(
        data.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Без имени",
          wallet: p.wallet || 0,
        })),
      );
    }
  };

  const loadCoins = async () => {
    setCoinsLoading(true);

    let query = supabase.from("coins").select("*", { count: "exact" });

    // Apply filters
    if (dateFrom) {
      query = query.gte("when", new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("when", endDate.toISOString());
    }
    if (filterUserId && filterUserId !== "__all__") {
      // Find profile id by user_id
      const profile = profiles.find((p) => p.user_id === filterUserId);
      if (profile) {
        query = query.eq("who", profile.id);
      }
    }
    if (amountOperator && amountOperator !== "__none__" && amountValue) {
      const numValue = parseInt(amountValue, 10);
      if (!isNaN(numValue)) {
        switch (amountOperator) {
          case ">":
            query = query.gt("amount", numValue);
            break;
          case "<":
            query = query.lt("amount", numValue);
            break;
          case "=":
            query = query.eq("amount", numValue);
            break;
          case ">=":
            query = query.gte("amount", numValue);
            break;
          case "<=":
            query = query.lte("amount", numValue);
            break;
        }
      }
    }

    // Pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.order("when", { ascending: false }).range(from, to);

    if (error) {
      console.error("Error loading coins:", error);
    } else {
      setCoins((data || []) as CoinRecord[]);
      setTotalCount(count || 0);
    }
    setCoinsLoading(false);
  };

  // Verify all coin hashes in the chain
  const verifyChain = async () => {
    setVerifying(true);
    setVerificationResults({});
    setVerificationSummary(null);

    // Load ALL coins ordered by time ascending for chain verification
    const { data: allCoins } = await supabase.from("coins").select("*").order("when", { ascending: true });

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
            error: errors.join(", "),
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
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Load coins when journal opens or filters/pagination change
  useEffect(() => {
    if (showJournal) {
      loadCoins();
    }
  }, [showJournal, currentPage, profiles]);

  const applyFilters = () => {
    setCurrentPage(1);
    loadCoins();
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFilterUserId("__all__");
    setAmountOperator("__none__");
    setAmountValue("");
    setCurrentPage(1);
    setTimeout(() => loadCoins(), 0);
  };

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
        const hashResult = data as string;
        setResultHash(hashResult);
        toast({
          title: "Успешно",
          description: isRubToCoin ? `Начислено ${sum} коинов` : `Списано ${sum} коинов`,
        });
        setAmount("");

        // Send notification message to recipient with hash
        const now = new Date();
        const dateStr = now.toLocaleString("ru-RU");
        const operationType = isRubToCoin ? "Начисление" : "Списание";

        // Get recipient's profile id
        const recipientProfile = profiles.find((p) => p.user_id === selectedUserId);
        const newBalance = recipientProfile
          ? isRubToCoin
            ? recipientProfile.wallet + sum
            : recipientProfile.wallet - sum
          : sum;

        const notificationContent =
          `💰 ${operationType} коинов\n\n` +
          `Сумма: ${isRubToCoin ? "+" : "-"}${sum} коинов\n` +
          `Новый баланс: ${newBalance} коинов\n` +
          `Дата: ${dateStr}\n\n` +
          `🔐 Хэш транзакции:\n${hashResult}`;

        await supabase.from("messages").insert([
          {
            from_id: selectedUserId,
            to_id: selectedUserId,
            message: notificationContent,
            type: "wallet" as const,
          },
        ]);

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
            })),
          );
        }
        if (showJournal) {
          loadCoins();
        }
      }
    } catch (err) {
      toast({ title: "Ошибка", description: "Не удалось выполнить операцию", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.user_id === selectedUserId);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Обмен рублей ↔ коинов</h2>
          <Button variant="outline" onClick={() => setShowJournal(true)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Журнал
          </Button>
        </div>

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
              <p className="font-medium">{isRubToCoin ? "Рубли → Коины" : "Коины → Рубли"}</p>
              <p className="text-sm text-muted-foreground">{isRubToCoin ? "Начисление коинов" : "Списание коинов"}</p>
            </div>
            <Switch checked={isRubToCoin} onCheckedChange={setIsRubToCoin} />
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

      {/* Journal Dialog */}
      <Dialog open={showJournal} onOpenChange={setShowJournal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Журнал операций с коинами
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 py-2 border-b">
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Фильтры
              </Button>
              <Button variant="outline" size="sm" onClick={verifyChain} disabled={verifying || coinsLoading}>
                <ShieldCheck className={cn("h-4 w-4 mr-1", verifying && "animate-pulse")} />
                {verifying ? "Проверка..." : "Верифицировать"}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={loadCoins} disabled={coinsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", coinsLoading && "animate-spin")} />
              Обновить
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date From */}
                <div className="space-y-1">
                  <Label className="text-xs">Дата от</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                </div>
                {/* Date To */}
                <div className="space-y-1">
                  <Label className="text-xs">Дата до</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                </div>
                {/* User Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Пользователь</Label>
                  <Select value={filterUserId} onValueChange={setFilterUserId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Все" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Все</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Amount Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Сумма</Label>
                  <div className="flex gap-1">
                    <Select value={amountOperator} onValueChange={setAmountOperator}>
                      <SelectTrigger className="h-9 w-20">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value=">=">&ge;</SelectItem>
                        <SelectItem value="<=">&le;</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={amountValue}
                      onChange={(e) => setAmountValue(e.target.value)}
                      placeholder="0"
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyFilters}>
                  Применить
                </Button>
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              </div>
            </div>
          )}

          {/* Verification Summary */}
          {verificationSummary && (
            <div
              className={cn(
                "p-3 rounded-lg flex items-center gap-4",
                verificationSummary.invalid === 0 && verificationSummary.errors === 0
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20",
              )}
            >
              {verificationSummary.invalid === 0 && verificationSummary.errors === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {verificationSummary.invalid === 0 && verificationSummary.errors === 0
                    ? "Цепочка верифицирована успешно"
                    : "Обнаружены проблемы в цепочке"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Всего: {verificationSummary.total} | Валидных:{" "}
                  <span className="text-green-600">{verificationSummary.valid}</span> | Невалидных:{" "}
                  <span className="text-red-600">{verificationSummary.invalid}</span> | Ошибок:{" "}
                  <span className="text-orange-600">{verificationSummary.errors}</span>
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-hidden">
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
                        <TableRow
                          key={coin.id}
                          className={cn(
                            verification?.status === "invalid" && "bg-red-500/5",
                            verification?.status === "error" && "bg-orange-500/5",
                          )}
                        >
                          <TableCell>
                            {verification ? (
                              <div title={verification.error || verification.decoded || ""}>
                                {verification.status === "valid" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {verification.status === "invalid" && <XCircle className="h-4 w-4 text-red-600" />}
                                {verification.status === "error" && <AlertCircle className="h-4 w-4 text-orange-600" />}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{new Date(coin.when).toLocaleString("ru-RU")}</TableCell>
                          <TableCell className="text-sm">{profile?.name || coin.who.slice(0, 8) + "..."}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium",
                              coin.amount > 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {coin.amount > 0 ? "+" : ""}
                            {coin.amount}
                          </TableCell>
                          <TableCell className="text-right text-sm">{coin.profile_balance}</TableCell>
                          <TableCell className="text-right text-sm">{coin.total_balance}</TableCell>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Показано {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} из{" "}
                {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || coinsLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <span className="text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || coinsLoading}
                >
                  Вперёд
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminContent = () => {
  const [activeSection, setActiveSection] = useState("Дашборд");
  const { user } = useCurrentUserWithRole();

  // Get user roles
  const userRoles = user?.roles || [];

  const availableMenu = adminMenu.filter((item) => item.roles.some(role => userRoles.includes(role)));

  const renderContent = () => {
    switch (activeSection) {
      case "Новости":
        return <AdminNews />;
      case "Коины":
        return <CoinExchangeSection />;
      case "Роли и права":
        return <RolesManagementSection />;
      default:
        return (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-16">Контент раздела «{activeSection}» будет здесь</p>
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
                className={cn("w-full nav-link", isActive && "active")}
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
            <p className="text-muted-foreground mt-1">Управление разделом «{activeSection}»</p>
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
