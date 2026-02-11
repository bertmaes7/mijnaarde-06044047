import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface RoleManagementProps {
  memberId: string;
  authUserId: string | null;
  isAdmin: boolean;
  memberEmail: string | null;
}

interface CreateAdminResponse {
  success: boolean;
  message: string;
  accountCreated: boolean;
  tempPassword?: string;
  email?: string;
  error?: string;
}

export function RoleManagement({ memberId, authUserId, isAdmin: initialIsAdmin, memberEmail }: RoleManagementProps) {
  const { isAdmin: currentUserIsAdmin, user } = useAuthContext();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwnAccount = user?.id === authUserId;

  const copyPassword = async () => {
    if (tempPasswordData) {
      await navigator.clipboard.writeText(tempPasswordData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleAdminRole = useMutation({
    mutationFn: async (shouldBeAdmin: boolean) => {
      if (shouldBeAdmin && !authUserId) {
        // Need to create admin account via edge function
        const { data, error } = await supabase.functions.invoke<CreateAdminResponse>("create-admin-account", {
          body: { memberId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return data;
      } else {
        // Use server-side edge function for role toggling
        const { data, error } = await supabase.functions.invoke("toggle-admin-role", {
          body: { memberId, shouldBeAdmin },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return { success: true, accountCreated: false } as CreateAdminResponse;
      }
    },
    onMutate: () => setIsUpdating(true),
    onSuccess: (data: CreateAdminResponse | undefined, shouldBeAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-ids"] });

      if (data?.accountCreated && data.tempPassword && data.email) {
        // Show password dialog
        setTempPasswordData({ email: data.email, password: data.tempPassword });
        setShowPasswordDialog(true);
        toast.success("Beheerdersaccount aangemaakt. Wachtwoord ook per e-mail verstuurd.");
      } else if (shouldBeAdmin) {
        toast.success("Beheerder-rol toegekend");
      } else {
        toast.success("Beheerder-rol verwijderd");
      }
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error(error instanceof Error ? error.message : "Fout bij het bijwerken van de rol");
    },
    onSettled: () => setIsUpdating(false),
  });

  // Don't render if current user is not admin
  if (!currentUserIsAdmin) return null;

  // Check if member has email (required for account creation)
  const canCreateAccount = !!memberEmail;

  return (
    <>
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
              </p>
              {!authUserId && !initialIsAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bij activatie wordt een account aangemaakt met een tijdelijk wachtwoord
                </p>
              )}
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
                onCheckedChange={(checked) => {
                  if (!canCreateAccount && checked && !authUserId) {
                    toast.error("Lid heeft geen e-mailadres. Voeg eerst een e-mailadres toe.");
                    return;
                  }
                  toggleAdminRole.mutate(checked);
                }}
                disabled={isUpdating || isOwnAccount}
              />
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          {isOwnAccount && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Je kunt je eigen beheerder-rol niet wijzigen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Beheerdersaccount aangemaakt
            </DialogTitle>
            <DialogDescription>
              Het account is aangemaakt en een e-mail met het wachtwoord is verstuurd naar {tempPasswordData?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">E-mailadres</Label>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">{tempPasswordData?.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tijdelijk wachtwoord</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                  {tempPasswordData?.password}
                </code>
                <Button variant="outline" size="icon" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              ⚠️ Dit wachtwoord wordt slechts éénmaal getoond. Bij de eerste inlog moet een nieuw wachtwoord worden ingesteld.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPasswordDialog(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
