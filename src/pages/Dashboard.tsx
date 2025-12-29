import { MainLayout } from "@/components/layout/MainLayout";
import { User, Building2, Tag, Settings, FileText, Bell, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";

// Mock user data
const mockUser = {
  name: "Иван Петров",
  email: "ivan@example.com",
  role: "client",
  businessCount: 2,
};

const dashboardLinks = [
  { label: "Профиль производителя", href: "/dashboard/profile", icon: UserCircle },
  { label: "Мои производители", href: "/dashboard/businesses", icon: Building2, count: 2 },
  { label: "Мои акции", href: "/dashboard/promotions", icon: Tag, count: 3 },
  { label: "Заявки", href: "/dashboard/requests", icon: FileText, count: 1 },
  { label: "Уведомления", href: "/dashboard/notifications", icon: Bell, count: 5 },
  { label: "Настройки", href: "/dashboard/settings", icon: Settings },
];

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* User Header */}
        <div className="content-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{mockUser.name}</h1>
              <p className="text-muted-foreground">{mockUser.email}</p>
              <span className="inline-block mt-1 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                Клиент
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="section-title">Управление</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboardLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="content-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{link.label}</p>
                    </div>
                    {link.count !== undefined && (
                      <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded">
                        {link.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Placeholder for activity */}
        <div className="content-card">
          <h2 className="section-title">Последняя активность</h2>
          <p className="text-muted-foreground text-center py-8">
            Здесь будет отображаться ваша активность
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
