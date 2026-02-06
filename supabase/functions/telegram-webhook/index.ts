import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name?: string;
    username?: string;
  };
  text: string;
  chat: {
    id: number;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: {
      id: number;
    };
    data: string;
  };
}

async function sendTelegramMessage(chatId: number, text: string, options?: {
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

async function handleStartCommand(chatId: number, firstName: string | undefined, token: string | undefined) {
  console.log("handleStartCommand called, token:", token);
  
  if (!token) {
    // No token provided - just welcome message
    const welcomeText = `Привет, ${firstName ?? "друг"}! 👋\n\n` +
      `Я бот портала Project Bloom.\n\n` +
      `Подпишитесь на новости на сайте, чтобы получать уведомления о новых событиях, акциях и обновлениях производителей.`;
    
    await sendTelegramMessage(chatId, welcomeText);
    return { success: true, action: "welcome" };
  }

  // Find the subscription token
  const { data: subscriptionToken, error } = await supabase
    .from("telegram_subscription_tokens")
    .select("*")
    .eq("token", token)
    .single();

  console.log("Token lookup result:", { found: !!subscriptionToken, error });

  if (error || !subscriptionToken) {
    console.log("Invalid token, sending error message");
    await sendTelegramMessage(chatId, "❌ Ссылка для подписки истекла или недействительна. Попробуйте подписаться снова на сайте.");
    return { success: false, reason: "invalid_token" };
  }

  // Check if token expired
  const expiresAt = new Date(subscriptionToken.expires_at);
  console.log("Token expires at:", expiresAt);
  if (expiresAt < new Date()) {
    console.log("Token expired, sending error message");
    await sendTelegramMessage(chatId, "⏰ Ссылка для подписки истекла. Попробуйте подписаться снова на сайте.");
    return { success: false, reason: "expired_token" };
  }

  console.log("Creating subscription for email:", subscriptionToken.email);

  // Determine subscription type and create/update subscription
  const subscriptionData: Record<string, unknown> = {
    email: subscriptionToken.email,
    telegram_chat_id: chatId.toString(),
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  if (subscriptionToken.type === "common") {
    subscriptionData.send_common = true;
    console.log("Type: common");
  } else if (subscriptionToken.type === "producer" && subscriptionToken.entity_id) {
    console.log("Type: producer, entity_id:", subscriptionToken.entity_id);
    // For producer subscription, send_common should be false
    subscriptionData.send_common = false;
    
    // Add producer to send_profiles array
    const { data: existingSub } = await supabase
      .from("newsletter_subscriptions")
      .select("send_profiles, send_common")
      .eq("email", subscriptionToken.email)
      .single();

    const currentProfiles = existingSub?.send_profiles || [];
    if (!currentProfiles.includes(subscriptionToken.entity_id)) {
      subscriptionData.send_profiles = [...currentProfiles, subscriptionToken.entity_id];
    } else {
      subscriptionData.send_profiles = currentProfiles;
    }
  }

  console.log("Upserting subscription data:", JSON.stringify(subscriptionData));

  // Upsert subscription
  const { error: upsertError } = await supabase
    .from("newsletter_subscriptions")
    .upsert(subscriptionData, { onConflict: "email" });

  console.log("Upsert result:", upsertError);

  if (upsertError) {
    console.error("Error upserting subscription:", upsertError);
    await sendTelegramMessage(chatId, "❌ Произошла ошибка при подписке. Попробуйте позже.");
    return { success: false, reason: "database_error" };
  }

  // Delete used token
  console.log("Deleting token:", subscriptionToken.id);
  await supabase.from("telegram_subscription_tokens").delete().eq("id", subscriptionToken.id);

  // Send success message
  let successText = `✅ Подписка оформлена!\n\n`;
  
  if (subscriptionToken.type === "common") {
    successText += `Вы подписались на новости и события портала.`;
  } else if (subscriptionToken.type === "producer") {
    successText += `Вы будете получать уведомления об обновлениях этого производителя.`;
  }

  successText += `\n\nВы всегда сможете отписаться, написав /stop.`;

  console.log("Sending success message to chatId:", chatId);
  await sendTelegramMessage(chatId, successText);

  return { success: true, action: "subscribed", type: subscriptionToken.type };
}

async function handleStopCommand(chatId: number) {
  const chatIdStr = chatId.toString();

  // Disable subscription
  const { error } = await supabase
    .from("newsletter_subscriptions")
    .update({ enabled: false, telegram_chat_id: null, updated_at: new Date().toISOString() })
    .eq("telegram_chat_id", chatIdStr);

  if (error) {
    console.error("Error disabling subscription:", error);
    await sendTelegramMessage(chatId, "❌ Произошла ошибка при отписке.");
    return { success: false, reason: "database_error" };
  }

  await sendTelegramMessage(chatId, `❌ Вы отписались от уведомлений.\n\n` +
    `Если передумаете, вы всегда сможете подписаться снова на сайте.`);

  return { success: true, action: "unsubscribed" };
}

async function handleStatusCommand(chatId: number) {
  const chatIdStr = chatId.toString();

  const { data: subscription, error } = await supabase
    .from("newsletter_subscriptions")
    .select("*")
    .eq("telegram_chat_id", chatIdStr)
    .single();

  if (error || !subscription) {
    await sendTelegramMessage(chatId, `📭 Вы не подписаны на уведомления.\n\n` +
      `Подпишитесь на сайте, чтобы получать новости и обновления.`);
    return { success: true, action: "status_not_subscribed" };
  }

  let statusText = `📬 Ваш статус подписки:\n\n`;
  statusText += subscription.send_common ? "✅" : "❌";
  statusText += ` Общие новости и события\n`;

  if (subscription.send_profiles && subscription.send_profiles.length > 0) {
    statusText += `\n📦 Подписки на производителей (${subscription.send_profiles.length}):\n`;
    // Note: We'd need to fetch producer names here
  }

  statusText += `\n\nНапишите /stop для отписки.`;

  await sendTelegramMessage(chatId, statusText);

  return { success: true, action: "status_shown" };
}

serve(async (req: Request) => {
  try {
    console.log("Webhook received request:", req.method);
    const update: TelegramUpdate = await req.json();
    console.log("Update:", JSON.stringify(update).substring(0, 500));

    if (!update.message && !update.callback_query) {
      return new Response("OK", { status: 200 });
    }

    if (update.message) {
      const { text, chat, from } = update.message;
      const chatId = chat.id;
      const firstName = from.first_name;

      if (text?.startsWith("/start")) {
        const token = text.split(" ")[1];
        return new Response(JSON.stringify(await handleStartCommand(chatId, firstName, token)), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (text === "/stop") {
        return new Response(JSON.stringify(await handleStopCommand(chatId)), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (text === "/status") {
        return new Response(JSON.stringify(await handleStatusCommand(chatId)), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Unknown command
        await sendTelegramMessage(chatId, `👋 Привет! Используйте:\n\n` +
          `• /start - подписаться\n` +
          `• /stop - отписаться\n` +
          `• /status - проверить статус`);
        return new Response("OK", { status: 200 });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
