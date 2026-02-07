import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface NotificationRequest {
  type: "common" | "producer";
  title: string;
  message: string;
  entityId?: string;
  entityType?: "news" | "event" | "promotion" | "product";
  link?: string;
}

async function sendTelegramMessage(chatId: string, text: string, options?: {
  reply_markup?: object;
}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (options?.reply_markup) {
    body.reply_markup = options.reply_markup;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.json();
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

Deno.serve(async (req: Request) => {
  try {
    const notification: NotificationRequest = await req.json();

    // Build notification text
    let text = `<b>${notification.title}</b>\n\n`;
    text += notification.message;

    if (notification.link) {
      text += `\n\n<a href="${notification.link}">Подробнее</a>`;
    }

    // Determine query based on type
    let query = supabase
      .from("newsletter_subscriptions")
      .select("id, email, telegram_chat_id, send_common, send_profiles")
      .eq("enabled", true)
      .not("telegram_chat_id", "is", null);

    if (notification.type === "common" && notification.entityType) {
      // For common notifications, notify based on entity type
      if (notification.entityType === "news" || notification.entityType === "event") {
        query = query.eq("send_common", true);
      } else if (notification.entityType === "promotion") {
        query = query.eq("send_promotions", true);
      }
    } else if (notification.type === "producer" && notification.entityId) {
      // For producer notifications
      query = query.contains("send_profiles", [notification.entityId]);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No subscriptions found",
        sent: 0 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      if (!subscription.telegram_chat_id) continue;

      try {
        const result = await sendTelegramMessage(subscription.telegram_chat_id, text);

        if (result.ok) {
          await logNotification(subscription.id, notification.type, notification.entityId, "sent");
          sentCount++;
        } else {
          await logNotification(
            subscription.id,
            notification.type,
            notification.entityId,
            "failed",
            result.description || "Unknown error"
          );
          failedCount++;
          errors.push(`${subscription.telegram_chat_id}: ${result.description}`);
        }
      } catch (err) {
        await logNotification(
          subscription.id,
          notification.type,
          notification.entityId,
          "failed",
          (err as Error).message
        );
        failedCount++;
        errors.push(`${subscription.telegram_chat_id}: ${(err as Error).message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return new Response(JSON.stringify({
      message: "Notifications processed",
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
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
