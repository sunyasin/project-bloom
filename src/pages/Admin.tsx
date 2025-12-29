import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Tag, 
  FileText, 
  Newspaper,
  Settings,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminRole = "moderator" | "news_editor" | "super_admin";

// Mock admin user
const mockAdminUser = {
  name: "Админ",
  role: "super_admin" as AdminRole,
};

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
  { label: "Роли и права", icon: Shield, roles: ["super_admin"] },
  { label: "Настройки", icon: Settings, roles: ["super_admin"] },
];

const Admin = () => {
  const [activeSection, setActiveSection] = useState("Дашборд");
  const userRole = mockAdminUser.role;

  const availableMenu = adminMenu.filter((item) => item.roles.includes(userRole));

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

          <div className="content-card">
            <p className="text-muted-foreground text-center py-16">
              Контент раздела «{activeSection}» будет здесь
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
