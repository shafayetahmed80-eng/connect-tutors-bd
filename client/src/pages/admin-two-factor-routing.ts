import { ADMIN_HOME_PATH } from "@/lib/adminHome";

export type AdminTwoFactorStatus = { enrolled: boolean; verified: boolean };

export function getAdminTwoFactorDestination(status: AdminTwoFactorStatus) {
  if (!status.enrolled) return "/admin/2fa-setup";
  if (!status.verified) return "/admin/2fa-challenge";
  return ADMIN_HOME_PATH;
}
