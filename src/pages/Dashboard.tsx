import { MainLayout } from "@/components/layout/MainLayout";
import { User, Building2, Tag, Settings, FileText, Bell, UserCircle, Package, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";


// Mock user data
const mockUser = {
  name: "Иван Петров",
  email: "ivan@example.com",
  role: "client",
  businessCount: 2,
};

// Mock business cards (визитки)
const mockBusinessCards = [
  { id: "1", name: "Фермерское хозяйство", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop" },
  { id: "2", name: "Молочная ферма", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200&h=200&fit=crop" },
  { id: "3", name: "Пасека Медовая", image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200&h=200&fit=crop" },
];

// Mock products (товары)
const mockProducts = [
  { id: "1", name: "Молоко свежее", price: 120, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop" },
  { id: "2", name: "Сыр домашний", price: 450, image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop" },
  { id: "3", name: "Мёд липовый", price: 800, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop" },
  { id: "4", name: "Яйца куриные", price: 150, image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop" },
  { id: "5", name: "Творог", price: 280, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop" },
  { id: "6", name: "Сметана", price: 180, image: "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?w=200&h=200&fit=crop" },
];

const dashboardLinks = [
  { label: "Профиль производителя", href: "/dashboard/profile", icon: UserCircle },
  { label: "Мои производители", href: "/dashboard/businesses", icon: Building2, count: 2 },
  { label: "Мои акции", href: "/dashboard/promotions", icon: Tag, count: 3 },
  { label: "Заявки", href: "/dashboard/requests", icon: FileText, count: 1 },
  { label: "Уведомления", href: "/dashboard/notifications", icon: Bell, count: 5 },
  { label: "Настройки", href: "/dashboard/settings", icon: Settings },
];

const Dashboard = () => {
  const navigate = useNavigate();

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

        {/* Business Cards (Визитки) */}
        <div>
          <h2 className="section-title">Мои визитки</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockBusinessCards.map((card) => (
              <Link
                key={card.id}
                to={`/business/${card.id}`}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md group p-3"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-foreground text-center truncate">
                  {card.name}
                </p>
              </Link>
            ))}
            {/* Create new business card */}
            <button
              onClick={() => navigate("/dashboard/business-card/new")}
              className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3 flex flex-col items-center justify-center min-h-[160px] border-dashed border-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Создать</p>
            </button>
          </div>
        </div>

        {/* Products (Товары) */}
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Package className="h-5 w-5" />
            Товары
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockProducts.map((product) => (
              <div
                key={product.id}
                className="content-card hover:border-primary/30 transition-all hover:shadow-md p-3"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-sm text-primary font-semibold">{product.price} ₽</p>
              </div>
            ))}
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
