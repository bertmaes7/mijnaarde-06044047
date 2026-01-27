import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface RoleManagementProps {
  memberId: string;
  authUserId: string | null;
}

export function RoleManagement({ memberId, authUserId }: RoleManagementProps) {
  const { isAdmin, user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch current roles for this member's auth user
  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", authUserId],
    queryFn: async () => {
      if (!authUserId) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", authUserId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!authUserId && isAdmin,
  });

  const hasAdminRole = roles?.some((r) => r.role === "admin") ?? false;
  const isOwnAccount = user?.id === authUserId;

  const toggleAdminRole = useMutation({
    mutationFn: async (shouldBeAdmin: boolean) => {
      if (!authUserId) throw new Error("Geen gekoppelde gebruiker gevonden");

      if (shouldBeAdmin) {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: authUserId, role: "admin" as const });

        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", authUserId)
          .eq("role", "admin");

        if (error) throw error;
      }
    },
    onMutate: () => setIsUpdating(true),
    onSuccess: (_, shouldBeAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles", authUserId] });
      toast.success(
        shouldBeAdmin
          ? "Admin-rol toegekend"
          : "Admin-rol verwijderd"
      );
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Fout bij het bijwerken van de rol");
    },
    onSettled: () => setIsUpdating(false),
  });

  // Don't render if not admin or no auth user linked
  if (!isAdmin) return null;
  
  if (!authUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Rollenbeheer
          </CardTitle>
          <CardDescription>
            Dit lid heeft nog geen account aangemaakt en kan daarom geen rollen toegewezen krijgen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Rollenbeheer
        </CardTitle>
        <CardDescription>
          Beheer de toegangsrechten van dit lid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Rollen laden...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin-role" className="text-base">
                Beheerder
              </Label>
              <p className="text-sm text-muted-foreground">
                Geeft toegang tot ledenbeheer, financiën en instellingen
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasAdminRole && (
                <Badge variant="default" className="bg-primary">
                  Admin
                </Badge>
              )}
              <Switch
                id="admin-role"
                checked={hasAdminRole}
                onCheckedChange={(checked) => toggleAdminRole.mutate(checked)}
                disabled={isUpdating || isOwnAccount}
              />
            </div>
          </div>
        )}

        {isOwnAccount && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Je kunt je eigen admin-rol niet wijzigen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
