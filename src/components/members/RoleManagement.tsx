import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface RoleManagementProps {
  memberId: string;
  authUserId: string | null;
  isAdmin: boolean;
}

export function RoleManagement({ memberId, authUserId, isAdmin: initialIsAdmin }: RoleManagementProps) {
  const { isAdmin: currentUserIsAdmin, user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwnAccount = user?.id === authUserId;

  const toggleAdminRole = useMutation({
    mutationFn: async (shouldBeAdmin: boolean) => {
      // Update the is_admin flag on the member
      const { error: memberError } = await supabase
        .from("members")
        .update({ is_admin: shouldBeAdmin })
        .eq("id", memberId);

      if (memberError) throw memberError;

      // If member has an auth account, also update user_roles for immediate effect
      if (authUserId) {
        if (shouldBeAdmin) {
          const { error } = await supabase
            .from("user_roles")
            .insert({ user_id: authUserId, role: "admin" as const });

          if (error && !error.message.includes("duplicate")) throw error;
        } else {
          const { error } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", authUserId)
            .eq("role", "admin");

          if (error) throw error;
        }
      }
    },
    onMutate: () => setIsUpdating(true),
    onSuccess: (_, shouldBeAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-ids"] });
      if (authUserId) {
        queryClient.invalidateQueries({ queryKey: ["user-roles", authUserId] });
      }
      toast.success(
        shouldBeAdmin
          ? "Beheerder-rol toegekend"
          : "Beheerder-rol verwijderd"
      );
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Fout bij het bijwerken van de rol");
    },
    onSettled: () => setIsUpdating(false),
  });

  // Don't render if current user is not admin
  if (!currentUserIsAdmin) return null;

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
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="admin-role" className="text-base">
              Beheerder
            </Label>
            <p className="text-sm text-muted-foreground">
              Geeft toegang tot ledenbeheer, financiën en instellingen
              {!authUserId && (
                <span className="block text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Rol wordt actief zodra dit lid een account aanmaakt
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {initialIsAdmin && (
              <Badge variant="default" className="bg-primary">
                Admin
              </Badge>
            )}
            <Switch
              id="admin-role"
              checked={initialIsAdmin}
              onCheckedChange={(checked) => toggleAdminRole.mutate(checked)}
              disabled={isUpdating || isOwnAccount}
            />
          </div>
        </div>

        {isOwnAccount && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Je kunt je eigen beheerder-rol niet wijzigen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
