import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

// Mock category data
const mockCategoryData: Record<string, { name: string; businesses: any[] }> = {
  "1": {
    name: "Молочные продукты",
    businesses: [
      { id: "2", name: "Ферма Петровых", location: "Московская область", products: "Сыры, молоко, творог" },
      { id: "5", name: "Молочный край", location: "Тульская область", products: "Кефир, сметана, масло" },
    ],
  },
};

const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const category = mockCategoryData[id || "1"] || { name: "Категория", businesses: [] };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
          <p className="text-muted-foreground mt-1">
            Производители в категории «{category.name}»
          </p>
        </div>

        {category.businesses.length > 0 ? (
          <div className="space-y-4">
            {category.businesses.map((business) => (
              <Link
                key={business.id}
                to={`/business/${business.id}`}
                className="content-card hover:border-primary/30 transition-colors block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{business.name}</h3>
                    <p className="text-sm text-muted-foreground">{business.products}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {business.location}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              В этой категории пока нет производителей
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CategoryPage;
