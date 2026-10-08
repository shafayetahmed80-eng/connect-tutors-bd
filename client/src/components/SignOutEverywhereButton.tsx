import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/** An Admin signs themselves out of every browser but this one - the answer to a lost phone or laptop. */
export function SignOutEverywhereButton() {
  const mutation = trpc.admin.signOutEverywhere.useMutation({
    onSuccess: () => toast.success("Signed out on every other device."),
    onError: error => toast.error(error.message),
  });
  return <Button
    type="button"
    disabled={mutation.isPending}
    onClick={() => { if (window.confirm("Sign out of every device? This browser stays signed in.")) mutation.mutate(); }}
    className="w-fit rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]"
  >
    <LogOut size={15} aria-hidden={true} /> {mutation.isPending ? "Signing out…" : "Sign out everywhere"}
  </Button>;
}
