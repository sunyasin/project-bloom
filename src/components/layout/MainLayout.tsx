import { ReactNode } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex max-w-7xl mx-auto">
        {/* Left Sidebar - Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border bg-sidebar">
          <LeftSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Promotions */}
        <aside className="hidden xl:block w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-border bg-sidebar">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
};
