import { Link } from "react-router-dom";
import { Menu, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">ДП</span>
          </div>
          <span className="font-semibold text-foreground text-lg hidden sm:inline">
            Долина Производителей
          </span>
        </Link>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="default" size="sm">
              Войти
            </Button>
          </Link>
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
