import { ENV } from "./_core/env";

export type GuardianRequestTelegramInput = {
  requestId: number;
  category: string;
  classCourse: string;
  subjects: string[];
  tuitionType: "home" | "online" | "both" | "group" | "package";
  groupCapacity?: number | null;
  packageDurationMonths?: number | null;
  daysPerWeek: number;
  preferredGender: "male" | "female" | "any";
  monthlyBudget: number | null;
  locationText: string;
  guardianPhone?: string;
  guardianEmail?: string | null;
};

function escapeTelegramText(value: string) {
  return value.replace(/[<&>]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[character] ?? character);
}

export function buildGuardianRequestTelegramMessage(input: GuardianRequestTelegramInput) {
  const budget = input.monthlyBudget === null ? "Not specified" : `${input.monthlyBudget} BDT`;
  return [
    `New Tutor Request #${input.requestId}`,
    `Category: ${escapeTelegramText(input.category)}`,
    `Class/Level: ${escapeTelegramText(input.classCourse)}`,
    `Subjects: ${input.subjects.map(escapeTelegramText).join(", ")}`,
    `Tuition: ${input.tuitionType}`,
    ...(input.tuitionType === "group" && input.groupCapacity !== null && input.groupCapacity !== undefined
      ? [`Maximum students: ${input.groupCapacity}`]
      : []),
    ...(input.tuitionType === "package" && input.packageDurationMonths !== null && input.packageDurationMonths !== undefined
      ? [`Package duration: ${input.packageDurationMonths} month${input.packageDurationMonths === 1 ? "" : "s"}`]
      : []),
    `Days per week: ${input.daysPerWeek}`,
    `Preferred gender: ${input.preferredGender}`,
    `Budget: ${budget}`,
    `Location: ${escapeTelegramText(input.locationText)}`,
    "Contact the Guardian through the approved private admin process.",
  ].join("\n");
}

/** Both the bot token and a numeric chat id (a group's is negative) - otherwise nothing is sent to Telegram at all. */
export function isTelegramAdminConfigured() {
  return Boolean(ENV.telegramBotToken && ENV.telegramChatId && /^-?\d+$/.test(ENV.telegramChatId));
}

/** A plain alert to the Admin chat - Admin activity alerts, and operational trouble such as the SMS balance running out. */
export async function sendTelegramAdminText(text: string) {
  const token = ENV.telegramBotToken;
  const chatId = ENV.telegramChatId;
  if (!isTelegramAdminConfigured()) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function notifyTelegramAdmin(input: GuardianRequestTelegramInput) {
  const token = ENV.telegramBotToken;
  const chatId = ENV.telegramChatId;
  if (!token || !chatId || !/^-?\d+$/.test(chatId)) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: buildGuardianRequestTelegramMessage(input) }),
    });
    return response.ok && Boolean((await response.json() as { ok?: boolean }).ok);
  } catch {
    return false;
  }
}
