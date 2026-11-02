import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "./api";

/** Mutation that toasts and refreshes every cached query on success. */
export function useAdminMutation<T>(fn: (v: T) => Promise<unknown>, success: string, after?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      qc.invalidateQueries();
      after?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
