import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/**
 * Signs the person out of every browser but this one - the answer to a lost
 * phone or laptop. An Admin's goes through the Admin panel (which also keeps
 * this browser's remembered second factor); a Tutor's or Guardian's through `account`.
 */
export function SignOutEverywhereButton({ member = false }: { member?: boolean }) {
  const options = {
    onSuccess: () => { toast.success("Signed out on every other device."); },
    onError: (error: { message: string }) => { toast.error(error.message); },
  };
  const admin = trpc.admin.signOutEverywhere.useMutation(options);
  const other = trpc.account.signOutEverywhere.useMutation(options);
  const mutation = member ? other : admin;
  return <Button
    type="button"
    disabled={mutation.isPending}
    onClick={() => { if (window.confirm("Sign out of every device? This browser stays signed in.")) mutation.mutate(); }}
    className="w-fit rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]"
  >
    <LogOut size={15} aria-hidden={true} /> {mutation.isPending ? "Signing out…" : "Sign out everywhere"}
  </Button>;
}
