import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const apiBaseUrl = Deno.env.get("APP_BASE_URL") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface ContentUpdate {
  id: string;
  entity_type: string;
  entity_id: string;
  producer_id: string | null;
  new_data: Record<string, unknown>;
}

interface MessageData {
  id: number;
  from_id: string;
  to_id: string;
  message: string;
  type: string;
}

async function sendTelegramMessage(chatId: string, text: string, link?: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  console.log(`[TELEGRAM] Sending to ${chatId}: ${text.substring(0, 350)}...(first 350 chars)`);
  
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  
  if (link) {
    body.reply_markup = {
      inline_keyboard: [[
        {
          text: "🔗 Подробнее",
          url: link,
        }
      ]],
    };
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    .select("first_name, last_name")
    .eq("user_id", producerId)
    .single();
  return data?.first_name || data?.last_name || "Производитель";
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

// Функция для обработки новых сообщений
async function processMessages(): Promise<{ processed: number; sent: number; failed: number }> {
  console.log("[MESSAGES] Checking for new messages with pending notifications...");
  
  // Найти сообщения где notification_sent_status IS NULL
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, from_id, to_id, message, type, created_at")
    .is("notification_sent_status", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[MESSAGES] Error fetching messages:", error);
    throw error;
  }

  if (!messages || messages.length === 0) {
    console.log("[MESSAGES] No pending messages found");
    return { processed: 0, sent: 0, failed: 0 };
  }

  console.log(`[MESSAGES] Found ${messages.length} pending messages to process`);

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    const messageId = msg.id;
    const fromId = msg.from_id;
    const toId = msg.to_id;
    const messageText = msg.message;
    const messageType = msg.type;

    // Пропустить сообщения от админа
    if (messageType === "admin_status") {
      await supabase
        .from("messages")
        .update({ notification_sent_status: "skipped_admin" })
        .eq("id", messageId);
      continue;
    }

    // Не отправлять уведомление самому себе
    if (fromId === toId) {
      await supabase
        .from("messages")
        .update({ notification_sent_status: "skipped_self" })
        .eq("id", messageId);
      continue;
    }

    // Найти подписку получателя по user_id или telegram_chat_id
    const { data: subscription, error: subError } = await supabase
      .from("newsletter_subscriptions")
      .select("id, user_id, telegram_chat_id, send_messages, enabled")
      .eq("user_id", toId)
      .eq("send_messages", true)
      .eq("enabled", true)
      .single();

    if (subError || !subscription || !subscription.telegram_chat_id) {
      console.log(`[MESSAGES] No subscription found for user: ${toId}`);
      await supabase
        .from("messages")
        .update({ notification_sent_status: "no_subscription" })
        .eq("id", messageId);
      continue;
    }

    // Получить имя отправителя
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", fromId)
      .single();

    const senderName = senderProfile
      ? `${senderProfile.first_name || ""} ${senderProfile.last_name || ""}`.trim()
      : "Пользователь";

    // Обрезать сообщение для превью
    const messagePreview = messageText?.substring(0, 200) || "";
    const truncated = messageText && messageText.length > 200 ? "..." : "";

    const chatLink = `${apiBaseUrl}/dashboard/messages`;

    const notificationText = `💬 <b>Новое сообщение</b>\n\n` +
      `👤 От: <b>${senderName}</b>\n` +
      `💬 ${messagePreview}${truncated}`;

    try {
      await sendTelegramMessage(subscription.telegram_chat_id, notificationText, chatLink);
      
      await supabase
        .from("messages")
        .update({ notification_sent_status: "ok" })
        .eq("id", messageId);
      
      console.log(`[MESSAGES] Notification sent for message ${messageId}`);
      sent++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message.substring(0, 100) : "Unknown error";
      await supabase
        .from("messages")
        .update({ notification_sent_status: errorMessage })
        .eq("id", messageId);
      
      console.error(`[MESSAGES] Failed to send notification for message ${messageId}:`, err);
      failed++;
    }

    // Небольшая задержка между запросами
    await new Promise((r) => setTimeout(r, 50));
  }

  return { processed: messages.length, sent, failed };
}

// Функция для обработки обновлений контента (новости, акции, товары)
async function processContentUpdates(): Promise<{ processed: number; sent: number; failed: number }> {
  console.log("[CONTENT] Fetching pending content updates...");

  const { data: updates, error } = await supabase
    .from("content_updates_log")
    .select("*")
    .eq("notification_sent", false)
    .is("processed_at", null)
    .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  if (error) {
    console.error("[CONTENT] Error fetching updates:", error);
    throw error;
  }

  if (!updates || updates.length === 0) {
    console.log("[CONTENT] No pending content updates found");
    return { processed: 0, sent: 0, failed: 0 };
  }

  console.log(`[CONTENT] Found ${updates.length} pending content updates to process`);

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
    
    const isProducerContent = entityType === "product" || (entityType === "news" && producerId);
    
    if (isProducerContent && producerId) {
      const producerName = await getProducerInfo(producerId);
      text = `<b>📢 Новость портала DolinaBiz от ${producerName}</b>\n\n`;
    } else if (entityType === "news" && !producerId) {
      text = `<b>📢 Новость портала DolinaBiz</b>\n\n`;
    } else if (entityType === "promotion") {
      text = `<b>🔥 Акция на портале DolinaBiz</b>\n\n`;
    }

    if (entityType === "product") {
      const productName = newData.name as string;
      const productPrice = newData.price as number;
      
      if (update.action === "insert") {
        text += `<b>🆕 Новый товар</b>\n${productName}\n`;
        if (productPrice) {
          text += `<b> ${productPrice} ₽</b>`;
        }
      } else if (update.action === "update" && productPrice) {
        text += `<b> Изменение цены\n${productName}\n📍 ${productPrice} ₽</b>`;
      }
    } else if (entityType === "news") {
      const entityTitle = newData.title || "Новость";
      text += `<b>${entityTitle}</b>`;
    } else if (entityType === "promotion") {
      const entityTitle = newData.name || newData.title || "Акция";
      text += `<b>${entityTitle}</b>`;
    }

    const baseUrl = apiBaseUrl;
    const linkMap: Record<string, string> = {
      product: `${baseUrl}/dashboard/product/${entityId}`,
      news: `${baseUrl}/news/${entityId}`,
      promotion: `${baseUrl}/promotions/${entityId}`,
    };
    const link = linkMap[entityType];

    for (const sub of subscriptions) {
      try {
        await sendTelegramMessage(sub.telegram_chat_id, text, link);
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

  return { processed: updates.length, sent, failed };
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-api-key",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Авторизация через API ключ или JWT
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("x-api-key");
  
  // Разрешаем доступ по API ключу cron или service role
  const expectedApiKey = Deno.env.get("SUPAPI_SECRET_KEY") ?? "";
  const isAuthorized = authHeader?.startsWith("Bearer ") || 
                       (apiKey && apiKey === expectedApiKey) ||
                       authHeader?.startsWith("ServiceRole");

  if (!isAuthorized && req.method !== "OPTIONS") {
    console.error("[SECURITY] Unauthorized: missing or invalid Authorization header");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";

    let messagesResult = { processed: 0, sent: 0, failed: 0 };
    let contentResult = { processed: 0, sent: 0, failed: 0 };

    // Обрабатываем сообщения
    if (type === "all" || type === "messages") {
      messagesResult = await processMessages();
    }

    // Обрабатываем обновления контента
    if (type === "all" || type === "content") {
      contentResult = await processContentUpdates();
    }

    const totalSent = messagesResult.sent + contentResult.sent;
    const totalFailed = messagesResult.failed + contentResult.failed;
    const totalProcessed = messagesResult.processed + contentResult.processed;

    console.log(`[SUMMARY] Processed: ${totalProcessed}, Sent: ${totalSent}, Failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({ 
        message: "Notifications processed",
        messages: messagesResult,
        content: contentResult,
        total: { processed: totalProcessed, sent: totalSent, failed: totalFailed }
      }),
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
