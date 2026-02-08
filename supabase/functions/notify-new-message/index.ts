import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://project-bloom.ru";

const supabase = createClient(supabaseUrl, supabaseKey);

interface NewMessagePayload {
  message_id: number;
  from_id: string;
  to_id: string;
  message: string;
  type: string;
}

async function sendTelegramMessage(chatId: number, text: string, link?: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  
  // Добавить inline кнопку с ссылкой если передана
  if (link) {
    body.reply_markup = {
      inline_keyboard: [[
        {
          text: "🔗 Открыть чат",
          url: link,
        }
      ]]
    };
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Парсинг form-data или JSON
async function parsePayload(req: Request): Promise<NewMessagePayload> {
  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    // Database Webhook отправляет form-data
    const formData = await req.formData();
    return {
      message_id: parseInt(formData.get("message_id") as string),
      from_id: formData.get("from_id") as string,
      to_id: formData.get("to_id") as string,
      message: formData.get("message") as string,
      type: formData.get("type") as string,
    };
  } else {
    // Edge Function вызов из старого триггера
    return await req.json();
  }
}

serve(async (req: Request) => {
  try {
    const payload = await parsePayload(req);
    const { message_id, from_id, to_id, message, type } = payload;
    
    console.log("New message notification:", { message_id, to_id, type });
    
    // Проверить, что уведомление уже не отправлялось
    const { data: messageData } = await supabase
      .from("messages")
      .select("notification_sent_status")
      .eq("id", message_id)
      .single();
    
    if (messageData?.notification_sent_status === "ok") {
      console.log("Notification already sent for message:", message_id);
      return new Response(JSON.stringify({ success: false, reason: "already_sent" }));
    }
    
    if (messageData?.notification_sent_status && messageData?.notification_sent_status !== "ok") {
      // Уже была ошибка, не пытаться повторно
      console.log("Previous error for message:", message_id, messageData.notification_sent_status);
      return new Response(JSON.stringify({ success: false, reason: "previous_error" }));
    }
    
    // Найти подписку получателя
    const { data: subscription, error } = await supabase
      .from("newsletter_subscriptions")
      .select("id, user_id, telegram_chat_id, send_messages, enabled")
      .eq("user_id", to_id)
      .eq("send_messages", true)
      .eq("enabled", true)
      .single();
    
    if (error || !subscription || !subscription.telegram_chat_id) {
      console.log("No subscription found for user:", to_id);
      await supabase
        .from("messages")
        .update({ notification_sent_status: "no_subscription" })
        .eq("id", message_id);
      return new Response(JSON.stringify({ success: false, reason: "no_subscription" }));
    }
    
    // Не отправлять уведомление самому себе
    if (from_id === to_id) {
      console.log("Self-message, skipping notification");
      return new Response(JSON.stringify({ success: false, reason: "self_message" }));
    }
    
    // Получить имя отправителя из profiles
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", from_id)
      .single();
    
    const senderName = senderProfile 
      ? `${senderProfile.first_name || ""} ${senderProfile.last_name || ""}`.trim() 
      : "Пользователь";
    
    const messagePreview = message.substring(0, 200);
    const truncated = message.length > 200 ? "..." : "";
    
    const chatLink = `${appBaseUrl}/dashboard/messages`;
    
    const notificationText = `💬 <b>Новое сообщение</b>\n\n` +
      `👤 От: <b>${senderName}</b>\n` +
      `💬 ${messagePreview}${truncated}`;
    
    // Отправить уведомление с inline кнопкой
    try {
      await sendTelegramMessage(parseInt(subscription.telegram_chat_id), notificationText, chatLink);
      
      // Обновить статус в сообщении
      await supabase
        .from("messages")
        .update({ notification_sent_status: "ok" })
        .eq("id", message_id);
      
      console.log("Notification sent to:", subscription.telegram_chat_id);
      return new Response(JSON.stringify({ success: true }));
    } catch (err) {
      // Записать ошибку
      const errorMessage = err instanceof Error ? err.message.substring(0, 100) : "Unknown error";
      await supabase
        .from("messages")
        .update({ notification_sent_status: errorMessage })
        .eq("id", message_id);
      
      console.error("Failed to send notification:", err);
      return new Response(JSON.stringify({ success: false, error: errorMessage }));
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
