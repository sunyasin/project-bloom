import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface ProducerUpdateRequest {
  producerId: string;
  updateType: "news" | "event" | "promotion" | "new_product" | "price_change";
  title: string;
  message: string;
  entityId?: string;
  link?: string;
}

// Database Webhook payload interface
interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    producer_id: string;
    name: string;
    [key: string]: any;
  };
  old_record?: {
    id: string;
    producer_id: string;
    [key: string]: any;
  };
}

function extractProducerData(payload: any): ProducerUpdateRequest | null {
  // Check if it's a Database Webhook payload
  if (payload.type && payload.record) {
    const record = payload.record;
    const producerId = record.producer_id;
    
    if (!producerId) {
      console.log("[notify-producer-update] No producer_id in record");
      return null;
    }

    const updateType = payload.type === "INSERT" ? "new_product" : "price_change";
    const baseUrl = Deno.env.get("APP_BASE_URL") ?? "https://project-bloom.com";

    return {
      producerId,
      updateType,
      title: payload.type === "INSERT" ? "Новый товар" : "Товар обновлён",
      message: record.name || "Обновление товара",
      entityId: record.id,
      link: `${baseUrl}/dashboard/product/${record.id}`,
    };
  }

  // Direct call payload
  if (payload.producerId) {
    return payload as ProducerUpdateRequest;
  }

  return null;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function getProducerInfo(producerId: string) {
  const { data: producer } = await supabase
    .from("profiles")
    .select("name, business_name")
    .eq("id", producerId)
    .single();

  if (!producer) {
    // Try producer_profiles table
    const { data: producerProfile } = await supabase
      .from("producer_profiles")
      .select("name")
      .eq("id", producerId)
      .single();

    return producerProfile?.name || "Производитель";
  }

  return producer.business_name || producer.name || "Производитель";
}

async function getSubscriptionsForProducer(producerId: string) {
  const { data: subscriptions } = await supabase
    .from("newsletter_subscriptions")
    .select("id, email, telegram_chat_id")
    .eq("enabled", true)
    .contains("send_profiles", [producerId])
    .not("telegram_chat_id", "is", null);

  return subscriptions || [];
}

async function logNotification(
  subscriptionId: string,
  type: string,
  entityId: string | undefined,
  status: "sent" | "failed",
  errorMessage?: string
) {
  await supabase.from("telegram_notifications").insert({
    subscription_id: subscriptionId,
    type,
    entity_id: entityId,
    status,
    error_message: errorMessage,
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  console.log("[notify-producer-update] Function called");
  console.log("[notify-producer-update] Method:", req.method);

  try {
    const rawPayload = await req.json();
    console.log("[notify-producer-update] Raw payload:", JSON.stringify(rawPayload, null, 2));

    // Extract producer update data from either direct call or webhook payload
    const update = extractProducerData(rawPayload);
    
    if (!update) {
      console.error("[notify-producer-update] Could not extract producer data from payload");
      return new Response(JSON.stringify({ error: "Invalid payload format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log("[notify-producer-update] Extracted update:", update);

    // Get producer name
    const producerName = await getProducerInfo(update.producerId);

    // Build notification text
    let text = `<b>📢 Обновление от ${producerName}</b>\n\n`;
    text += `<b>${update.title}</b>\n\n`;
    text += update.message;

    if (update.link) {
      text += `\n\n<a href="${update.link}">Смотреть</a>`;
    }

    // Get emoji for update type
    const typeEmoji: Record<string, string> = {
      news: "📰",
      event: "📅",
      promotion: "🔥",
      new_product: "🆕",
      price_change: "💰",
    };
    
    // Add type prefix
    text = text.replace("<b>📢 Обновление", `<b>${typeEmoji[update.updateType] || "📢"} Обновление`);

    // Get subscribers
  const subscriptions = await getSubscriptionsForProducer(update.producerId);
  
  console.log("[notify-producer-update] Found subscriptions:", subscriptions.length);
  console.log("[notify-producer-update] Subscriptions:", subscriptions);

  if (subscriptions.length === 0) {
    console.log("[notify-producer-update] No subscribers for producer:", update.producerId);
    return new Response(JSON.stringify({ 
      message: "No subscribers for this producer",
      sent: 0 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const subscription of subscriptions) {
      if (!subscription.telegram_chat_id) continue;

      try {
        await sendTelegramMessage(subscription.telegram_chat_id, text);
        await logNotification(subscription.id, "producer", update.entityId, "sent");
        sentCount++;
      } catch (err) {
        await logNotification(
          subscription.id,
          "producer",
          update.entityId,
          "failed",
          (err as Error).message
        );
        failedCount++;
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return new Response(JSON.stringify({
      message: "Producer update notifications sent",
      producer: producerName,
      updateType: update.updateType,
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
