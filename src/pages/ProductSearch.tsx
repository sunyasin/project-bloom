import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProductDetailsDialog,
  ProductForDialog,
} from "@/components/ProductDetailsDialog";
import type { User } from "@supabase/supabase-js";

interface SearchProduct extends ProductForDialog {
  businessId: string;
  businessName: string;
  ownerId: string;
}

const ProductSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialBarterOnly = searchParams.get("barter") === "true";

  const [query, setQuery] = useState(initialQuery);
  const [barterOnly, setBarterOnly] = useState(initialBarterOnly);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const name =
            [data.first_name, data.last_name].filter(Boolean).join(" ") ||
            data.email ||
            "Аноним";
          setCurrentUserName(name);
          setOrderPhone(data.phone || "");
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  // Search on initial load if query exists
  useEffect(() => {
    if (initialQuery.length >= 3) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (query.length < 3) return;

    setLoading(true);
    setSearched(true);

    // Update URL params
    const params = new URLSearchParams();
    params.set("q", query);
    if (barterOnly) params.set("barter", "true");
    setSearchParams(params);

    // Search products by name
    let productsQuery = supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .ilike("name", `%${query}%`);

    if (barterOnly) {
      productsQuery = productsQuery.in("sale_type", [
        "barter_goods",
        "barter_coin",
      ]);
    }

    const { data: productsData, error } = await productsQuery;

    if (error) {
      console.error("Search error:", error);
      setLoading(false);
      return;
    }

    if (!productsData || productsData.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    // Get producer IDs
    const producerIds = [...new Set(productsData.map((p) => p.producer_id))];

    // Fetch businesses for producers
    const { data: businessesData } = await supabase
      .from("businesses")
      .select("*")
      .in("owner_id", producerIds)
      .eq("status", "published");

    // Create lookup map
    const businessByOwnerId = new Map(
      (businessesData || []).map((b) => [b.owner_id, b])
    );

    // Map products with business info
    const searchProducts: SearchProduct[] = productsData
      .map((p) => {
        const business = businessByOwnerId.get(p.producer_id);
        if (!business) return null;

        return {
          id: p.id,
          name: p.name,
          image: p.image_url || "/placeholder.svg",
          price: p.price
            ? `${p.price} ₽${p.unit ? `/${p.unit}` : ""}`
            : "Цена по запросу",
          rawPrice: p.price || 0,
          coinPrice: p.coin_price || null,
          saleType: p.sale_type || "sell_only",
          description: p.description || "",
          content: p.content || "",
          unit: p.unit || "шт",
          galleryUrls: p.gallery_urls || [],
          businessId: business.id,
          businessName: business.name,
          ownerId: business.owner_id || "",
        };
      })
      .filter(Boolean) as SearchProduct[];

    setProducts(searchProducts);
    setLoading(false);
  };

  const handleProductClick = (product: SearchProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const canSearch = query.length >= 3;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Поиск товаров</h1>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Введите название товара (мин. 3 буквы)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSearch && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={!canSearch || loading}>
                <Search className="h-4 w-4 mr-2" />
                Искать
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="barter-filter"
                checked={barterOnly}
                onCheckedChange={(checked) => setBarterOnly(checked as boolean)}
              />
              <Label htmlFor="barter-filter" className="cursor-pointer">
                Только бартер
              </Label>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : searched ? (
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="content-card hover:border-primary/30 transition-colors p-3 text-left group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {product.businessName}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {product.price}
                  </p>
                  {(product.saleType === "barter_goods" ||
                    product.saleType === "barter_coin") && (
                    <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Бартер
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="content-card">
              <p className="text-muted-foreground text-center py-8">
                Ничего не найдено по запросу «{query}»
              </p>
            </div>
          )
        ) : (
          <div className="content-card">
            <p className="text-muted-foreground text-center py-8">
              Введите минимум 3 буквы для поиска
            </p>
          </div>
        )}
      </div>

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        businessId={selectedProduct?.businessId || ""}
        businessName={selectedProduct?.businessName || ""}
        ownerId={selectedProduct?.ownerId || ""}
        currentUser={currentUser}
        currentUserName={currentUserName}
        orderPhone={orderPhone}
      />
    </MainLayout>
  );
};

export default ProductSearch;
