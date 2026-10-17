// Helps set up the Admin Telegram alerts, from the server, in the app folder.
//
//   node scripts/telegram-setup.mjs          checks the bot token and lists the chats the bot is in,
//                                            each with the TELEGRAM_CHAT_ID line to copy into .env
//   node scripts/telegram-setup.mjs --test   also sends one test message to TELEGRAM_CHAT_ID
//
// The bot token and chat id come from the environment, or from the .env file in this folder.
// Without --test it only reads; it never changes .env itself.

import { existsSync, readFileSync } from "node:fs";

/** A value from the environment, else from the .env file next to package.json. */
function setting(name) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(".env")) return undefined;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`).exec(line.replace(/\r$/, ""));
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2") || undefined;
  }
  return undefined;
}

async function telegram(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return response.json();
}

const token = setting("TELEGRAM_BOT_TOKEN");
if (!token) {
  console.log("TELEGRAM_BOT_TOKEN is not in .env yet.");
  console.log("1. In Telegram, open @BotFather, send /newbot, follow the steps and copy the token it gives.");
  console.log("2. Add a line to .env:  TELEGRAM_BOT_TOKEN=<that token>");
  console.log("3. Run this again.");
  process.exit(1);
}

const me = await telegram(token, "getMe");
if (!me.ok) {
  console.log(`The bot token was refused by Telegram (${me.description ?? "unknown reason"}). Copy it again from @BotFather.`);
  process.exit(1);
}
console.log(`Bot token ............ OK (@${me.result.username})`);

const updates = await telegram(token, "getUpdates", { allowed_updates: ["message", "my_chat_member", "channel_post"] });
const chats = new Map();
for (const update of updates.ok ? updates.result : []) {
  const chat = update.message?.chat ?? update.my_chat_member?.chat ?? update.channel_post?.chat;
  if (chat) chats.set(chat.id, chat);
}
if (chats.size === 0) {
  console.log("\nThe bot has not seen any chat yet.");
  console.log("Add the bot to your Admin group, send /start in the group, then run this again.");
} else {
  console.log("\nChats the bot is in (copy the line of your Admin group into .env):");
  for (const chat of chats.values()) {
    const name = chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(" ") ?? "";
    console.log(`  TELEGRAM_CHAT_ID=${chat.id}    (${chat.type}: ${name})`);
  }
}

const chatId = setting("TELEGRAM_CHAT_ID");
console.log(`\nTELEGRAM_CHAT_ID in .env .. ${chatId ? chatId : "not set yet"}`);
if (chatId && !/^-?\d+$/.test(chatId)) console.log("  That is not a chat id: it must be a number (a group's starts with -).");

if (process.argv.includes("--test")) {
  if (!chatId || !/^-?\d+$/.test(chatId)) {
    console.log("\nNo test message sent: set TELEGRAM_CHAT_ID first.");
    process.exit(1);
  }
  const sent = await telegram(token, "sendMessage", { chat_id: chatId, text: "🔔 Connect Tutors: Admin Telegram alerts are working." });
  console.log(sent.ok ? "\nTest message ........ SENT - look in the group." : `\nTest message ........ FAILED (${sent.description ?? "unknown reason"})`);
  if (sent.ok) console.log("Now restart the site (update.sh does it) so it reads the new .env lines.");
}
