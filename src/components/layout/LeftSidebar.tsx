import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Tag, Calendar, Newspaper, FolderTree, ArrowLeftRight, LayoutGrid, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: "Главная", href: "/", icon: Home },
  { label: "Акции", href: "/promotions", icon: Tag },
  { label: "События", href: "/events", icon: Calendar },
  { label: "Новости долины", href: "/news", icon: Newspaper },
  { label: "Категории", href: "/categories", icon: LayoutGrid },
  { label: "Все производители", href: "/businesses", icon: FolderTree },
  // { label: "Бартерон", href: "/barter", icon: ArrowLeftRight, disabled: true },
];

export const LeftSidebar = () => {
  const location = useLocation();

  return (
    <nav className="p-4 space-y-1">
      <div className="mb-4">
        <h3 className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Навигация</h3>
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        return (
          <RouterNavLink
            key={item.href}
            to={item.disabled ? "#" : item.href}
            className={cn("nav-link", isActive && !item.disabled && "active", item.disabled && "disabled")}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.disabled && (
              <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Скоро</span>
            )}
          </RouterNavLink>
        );
      })}
    </nav>
  );
};
