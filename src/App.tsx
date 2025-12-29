import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import News from "./pages/News";
import Events from "./pages/Events";
import Promotions from "./pages/Promotions";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import Businesses from "./pages/Businesses";
import Auth from "./pages/Auth";
import BusinessPage from "./pages/BusinessPage";
import Dashboard from "./pages/Dashboard";
import ProducerProfile from "./pages/ProducerProfile";
import BusinessCardEditor from "./pages/BusinessCardEditor";
import Admin from "./pages/Admin";
import Barter from "./pages/Barter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/news" element={<News />} />
          <Route path="/events" element={<Events />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/businesses" element={<Businesses />} />
          <Route path="/business/:id" element={<BusinessPage />} />
          <Route path="/barter" element={<Barter />} />
          
          {/* User dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/profile" element={<ProducerProfile />} />
          <Route path="/dashboard/business-card/:id" element={<BusinessCardEditor />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          
          {/* Admin panel */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
