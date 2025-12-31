import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin, Filter } from "lucide-react";
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
import type { Business } from "@/types/db";

const Businesses = () => {
  const [cityFilter, setCityFilter] = useState("Все города");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>(["Все города"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, category, location, city, created_at");
      
      if (error) {
        console.error("Error fetching businesses:", error);
        return;
      }
      
      if (data) {
        setBusinesses(data);
        // Extract unique cities
        const uniqueCities = [...new Set(data.map(b => b.city))];
        setCities(["Все города", ...uniqueCities.sort()]);
      }
      setLoading(false);
    };

    fetchBusinesses();
  }, []);

  const filteredBusinesses = cityFilter === "Все города"
    ? businesses
    : businesses.filter(b => b.city === cityFilter);

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

        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/business/${business.id}`}
                className="content-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
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
            ))}
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
