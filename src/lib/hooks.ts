import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { useAuth } from "./auth";

export const useCourses = () =>
  useQuery({ queryKey: ["courses"], queryFn: () => api.courses.listAll() });
export const useUniversities = () =>
  useQuery({ queryKey: ["universities"], queryFn: () => api.universities.listAll() });
export const useAllProgrammes = () =>
  useQuery({ queryKey: ["programmes", "all"], queryFn: () => api.programmes.listAll() });

/** Following state + toggle. Sends visitors to log in first. */
export function useFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["following"],
    queryFn: () => api.me.subscriptions.list(),
    enabled: !!user && user.role === "student",
  });
  const ids = new Set((q.data ?? []).map((f) => f.university._id));
  const m = useMutation({
    mutationFn: (uid: string) =>
      ids.has(uid) ? api.me.subscriptions.unfollow(uid) : api.me.subscriptions.follow(uid),
    onSuccess: (_d, uid) => {
      toast.success(ids.has(uid) ? "Unfollowed university" : "Following — you'll get its updates");
      qc.invalidateQueries({ queryKey: ["following"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return {
    ids,
    list: q.data ?? [],
    isLoading: q.isLoading,
    canFollow: !!user && user.role === "student",
    toggle: (uid: string) => {
      if (!user) {
        toast.info("Log in as a student to follow universities");
        return;
      }
      m.mutate(uid);
    },
  };
}
