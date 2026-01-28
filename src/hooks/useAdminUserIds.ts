import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useAdminUserIds() {
  const { isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ["admin-user-ids"],
    queryFn: async () => {
      // Get auth_user_ids of members who are marked as admin
      const { data, error } = await supabase
        .from("members")
        .select("auth_user_id")
        .eq("is_admin", true)
        .not("auth_user_id", "is", null);

      if (error) throw error;
      return data.map((m) => m.auth_user_id).filter(Boolean) as string[];
    },
    enabled: isAdmin,
  });
}

export function useAdminMemberIds() {
  const { isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ["admin-member-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id")
        .eq("is_admin", true);

      if (error) throw error;
      return data.map((m) => m.id);
    },
    enabled: isAdmin,
  });
}
