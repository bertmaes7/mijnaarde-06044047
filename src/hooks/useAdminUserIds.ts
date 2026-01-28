import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useAdminUserIds() {
  const { isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ["admin-user-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) throw error;
      return data.map((r) => r.user_id);
    },
    enabled: isAdmin,
  });
}
