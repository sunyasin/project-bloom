import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useExchangeCount(profileId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      if (!profileId) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        const { count: exchangeCount, error } = await supabase
          .from("exchange")
          .select("*", { count: "exact", head: true })
          .or(`creator.eq.${profileId},provider.eq.${profileId}`)
          .neq("status", "reject")
          .neq("status", "finished");

        if (error) throw error;
        setCount(exchangeCount || 0);
      } catch (error) {
        console.error("Error fetching exchange count:", error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [profileId]);

  return { count, loading };
}
