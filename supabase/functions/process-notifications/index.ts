import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface ContentUpdate {
  id: string;
  entity_type: string;
  entity_id: string;
  producer_id: string | null;
  new_data: Record<string, unknown>;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  console.log(`[TELEGRAM] Sending to ${chatId}: ${text.substring(0, 50)}...`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TELEGRAM ERROR] HTTP ${response.status}: ${errorText}`);
    throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.ok) {
    console.error(`[TELEGRAM ERROR] Code ${result.error_code}: ${result.description}`);
    throw new Error(`Telegram error ${result.error_code}: ${result.description}`);
  }

  console.log(`[TELEGRAM] Message sent successfully, message_id: ${result.result?.message_id}`);
  return result;
}

async function getProducerInfo(producerId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("name, business_name")
    .eq("id", producerId)
    .single();
  return data?.business_name || data?.name || "Производитель";
}

async function getSubscriptions(
  entityType: string,
  producerId?: string
) {
  let query = supabase
    .from("newsletter_subscriptions")
    .select("id, telegram_chat_id")
    .eq("enabled", true)
    .not("telegram_chat_id", "is", null);

  if (producerId) {
    query = query.contains("send_profiles", [producerId]);
  } else if (entityType === "news") {
    query = query.eq("send_common", true);
  } else if (entityType === "promotion") {
    query = query.eq("send_promotions", true);
  }

  const { data } = await query;
  return data || [];
}

async function logNotification(
  subscriptionId: string,
  type: string,
  entityId: string | undefined,
  status: "sent" | "failed"
) {
  await supabase.from("telegram_notifications").insert({
    subscription_id: subscriptionId,
    type,
    entity_id: entityId,
    status,
  });
}

serve(async (req: Request) => {
  // CORS для браузерных запросов
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Получаем необработанные уведомления
    console.log("[DEBUG] Fetching pending notifications from content_updates_log...");
    const { data: updates, error } = await supabase
      .from("content_updates_log")
      .select("*")
      .eq("notification_sent", false)
      .is("processed_at", null)
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    console.log("[DEBUG] Query result:", { count: updates?.length, error });

    if (error) {
      console.error("[DEBUG] Error fetching updates:", error);
      throw error;
    }
    if (!updates || updates.length === 0) {
      console.log("[DEBUG] No pending notifications found");
      return new Response(JSON.stringify({ 
        message: "No pending notifications",
        debug: { checked: "content_updates_log", filter: "notification_sent=false" }
      }));
    }

    console.log(`[DEBUG] Found ${updates.length} pending notifications to process`);
    for (const u of updates) {
      console.log(`[DEBUG] Update: id=${u.id}, entity_type=${u.entity_type}, entity_id=${u.entity_id}, producer_id=${u.producer_id}`);
    }

    let sent = 0;
    let failed = 0;

    for (const update of updates) {
      const entityType = update.entity_type;
      const entityId = update.entity_id;
      const producerId = update.producer_id;
      const newData = update.new_data as Record<string, unknown>;

      // Определяем подписчиков
      const subscriptions = await getSubscriptions(entityType, producerId || undefined);

      if (subscriptions.length === 0) {
        await supabase
          .from("content_updates_log")
          .update({ notification_sent: true, processed_at: new Date().toISOString() })
          .eq("id", update.id);
        continue;
      }

      // Формируем текст уведомления
      let text = "";
      if (producerId) {
        const producerName = await getProducerInfo(producerId);
        text = `<b>📢 ${producerName}</b>\n\n`;
      } else {
        text = `<b>📢 Новость портала</b>\n\n`;
      }

      // Логика для товаров в зависимости от типа действия
      if (entityType === "product") {
        const productName = newData.name as string;
        const productPrice = newData.price as number;
        
        if (update.action === "insert") {
          text += `<b>🆕 Новый товар</b>\n${productName}\n`;
          if (productPrice) {
            text += `💰 ${productPrice} ₽`;
          }
        } else if (update.action === "update" && productPrice) {
          text += `<b>💰 Изменение цены</b>\n${productName}\n📍 ${productPrice} ₽`;
        }
      } else {
        const typeEmoji: Record<string, string> = {
          news: "📰",
          promotion: "🔥",
        };
        const typeName: Record<string, string> = {
          news: "Новость",
          promotion: "Акция",
        };
        text += `<b>${typeEmoji[entityType] || "📢"} ${typeName[entityType] || entityType}</b>\n\n`;
        text += newData.name || newData.title || "Обновление";
      }

      const baseUrl = Deno.env.get("APP_BASE_URL") ?? "https://project-bloom.com";
      const linkMap: Record<string, string> = {
        product: `/dashboard/product/${entityId}`,
        news: `/news/${entityId}`,
        promotion: `/promotions/${entityId}`,
      };
      text += `\n\n<a href="${baseUrl}${linkMap[entityType] || "#"}">Подробнее</a>`;

      // Отправляем подписчикам
      for (const sub of subscriptions) {
        try {
          await sendTelegramMessage(sub.telegram_chat_id, text);
          await logNotification(sub.id, "producer", entityId, "sent");
          sent++;
        } catch (err) {
          await logNotification(sub.id, "producer", entityId, "failed");
          failed++;
        }
        await new Promise((r) => setTimeout(r, 50));
      }

      await supabase
        .from("content_updates_log")
        .update({ notification_sent: true, processed_at: new Date().toISOString() })
        .eq("id", update.id);
    }

    return new Response(
      JSON.stringify({ message: "Notifications processed", sent, failed }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
