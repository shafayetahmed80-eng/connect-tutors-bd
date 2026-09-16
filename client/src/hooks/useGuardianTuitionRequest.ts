import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Sending and withdrawing a Guardian's Confirm, Remove or Cancel request.
 *
 * Both Guardian screens that show a waiting request - Applied Tutors and
 * Posted jobs - are refreshed after either, so the mark appears or goes on
 * whichever one the Guardian returns to.
 */
export function useGuardianTuitionRequest() {
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.tutorRequests.appliedTutors.invalidate();
    void utils.tutorRequests.mine.invalidate();
  };
  const onError = (error: { message: string }) => { toast.error(error.message); };
  const send = trpc.tutorRequests.requestTuitionChange.useMutation({
    onSuccess: () => { refresh(); toast.success("Request sent."); },
    onError,
  });
  const withdraw = trpc.tutorRequests.withdrawTuitionChange.useMutation({
    onSuccess: () => { refresh(); toast.success("Request withdrawn."); },
    onError,
  });
  return { send, withdraw, busy: send.isPending || withdraw.isPending };
}
