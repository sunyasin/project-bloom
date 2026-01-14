import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserWithRole } from "@/hooks/use-current-user-with-role";
import type { User } from "@supabase/supabase-js";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: userWithRole } = useCurrentUserWithRole();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из аккаунта",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Выход выполнен",
        description: "Вы вышли из аккаунта",
      });
      navigate("/");
    }
  };

  // Get user initials from email
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

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
          {!loading && user && (
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
          
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          ) : user ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden xl:inline">
                  {user.email}
                </span>
              </Link>
              
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Вход
                </Button>
              </Link>
              <Link to="/auth?mode=register">
                <Button variant="default" size="sm">
                  Регистрация
                </Button>
              </Link>
            </>
          )}
          
          {user && userWithRole?.role === "super_admin" && (
            <Link to="/admin">
              <Button variant="outline" size="sm">
                Админка
              </Button>
            </Link>
          )}
          {user && userWithRole?.role === "moderator" && (
            <Link to="/moderator">
              <Button variant="outline" size="sm">
                Админка
              </Button>
            </Link>
          )}
          {user && userWithRole?.role === "news_editor" && (
            <Link to="/news-editor">
              <Button variant="outline" size="sm">
                Админка
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
