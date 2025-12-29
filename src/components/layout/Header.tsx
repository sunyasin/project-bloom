import { Link } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Заглушка: имитация залогиненного пользователя-производителя
const mockCurrentUser = {
  id: "1",
  name: "Иван Фермер",
  email: "ivan@farm.ru",
  role: "client" as const,
  isProducer: true,
  avatar: "",
};

export const Header = () => {
  const isLoggedIn = true; // Имитация авторизации

  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ДП</span>
            </div>
          </Link>
          
          {/* Main Navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            <a href="#products" className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              Товары/услуги
            </a>
            <a href="#events" className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              События
            </a>
            <a href="#news" className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              Новости
            </a>
          </nav>
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          {isLoggedIn ? (
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={mockCurrentUser.avatar} alt={mockCurrentUser.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {mockCurrentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden xl:inline">
                {mockCurrentUser.name}
              </span>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm">
                Войти
              </Button>
            </Link>
          )}
          
          <Link to="/admin">
            <Button variant="outline" size="sm">
              Админка
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
