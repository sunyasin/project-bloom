import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Дефолтное изображение для визиток без картинки
const DEFAULT_BUSINESS_IMAGE = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop";

import { Input } from "@/components/ui/input";
// Локальный тип для отображения (не требует все поля из Business)
interface BusinessDisplay {
  id: string;
  name: string;
  category: string;
  location: string;
  city: string;
  content_json: Record<string, unknown> | null;
}

const Businesses = () => {
  const [cityFilter, setCityFilter] = useState("Все города");
  const [nameFilter, setNameFilter] = useState("");
  const [businesses, setBusinesses] = useState<BusinessDisplay[]>([]);
  const [cities, setCities] = useState<string[]>(["Все города"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, category, location, city, content_json")
        .eq("status", "published");
      
      if (error) {
        console.error("Error fetching businesses:", error);
        return;
      }
      
      if (data) {
        setBusinesses(data as BusinessDisplay[]);
        // Extract unique cities
        const uniqueCities = [...new Set(data.map(b => b.city))];
        setCities(["Все города", ...uniqueCities.sort()]);
      }
      setLoading(false);
    };

    fetchBusinesses();
  }, []);

  const filteredBusinesses = businesses.filter(b => {
    const matchesCity = cityFilter === "Все города" || b.city === cityFilter;
    const matchesName = nameFilter === "" || b.name.toLowerCase().includes(nameFilter.toLowerCase());
    return matchesCity && matchesName;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Все производители</h1>
            <p className="text-muted-foreground mt-1">
              Каталог местных производителей
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue placeholder="Выберите город" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map((business) => {
              const imageUrl = (business.content_json as { image?: string } | null)?.image || DEFAULT_BUSINESS_IMAGE;
              return (
              <Link
                key={business.id}
                to={`/business/${business.id}`}
                className="content-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                    <img
                      src={imageUrl}
                      alt={business.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground">{business.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{business.category}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {business.city}, {business.location}
                    </div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              В выбранном городе нет производителей
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Businesses;
