import { Link } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Заглушка: имитация залогиненного пользователя-производителя
const mockCurrentUser = {
  id: "1",
  name: "Иван Фермер",
  email: "ivan@farm.ru",
  role: "client" as const,
  isProducer: true,
  avatar: "",
};

// Пункты главного меню
const mainMenuItems = [
  { label: "Категории", href: "/categories" },
  { label: "Производители", href: "/businesses" },
  { label: "Акции", href: "/promotions" },
  { label: "События", href: "/events" },
  { label: "Новости", href: "/news" },
  { label: "Бартерон", href: "/barter" },
];

export const Header = () => {
  const isLoggedIn = true; // Имитация авторизации

  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo with Dropdown Menu */}
        <div className="flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">ДП</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background border border-border shadow-lg z-50">
              <DropdownMenuItem asChild>
                <Link to="/" className="w-full cursor-pointer">
                  Главная
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {mainMenuItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link to={item.href} className="w-full cursor-pointer">
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Main Navigation - duplicated in header */}
          <nav className="hidden md:flex items-center gap-1">
            {mainMenuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

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
