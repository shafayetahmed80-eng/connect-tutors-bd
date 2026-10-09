import type { ReactNode } from "react";
import { promptToInstallApp, useCanInstallApp } from "@/lib/installApp";

/**
 * "Install app", shown only while the browser has offered to install this site
 * as an app. Everywhere else - Safari on iPhone, a browser that has not offered,
 * the installed app itself - it renders nothing at all.
 */
export default function InstallAppButton({ className, children = "Install app" }: { className?: string; children?: ReactNode }) {
  const canInstall = useCanInstallApp();
  if (!canInstall) return null;
  return <button type="button" className={className} onClick={() => void promptToInstallApp()}>{children}</button>;
}
