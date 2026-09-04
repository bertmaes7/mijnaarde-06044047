import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { OrganizationLogo } from "@/components/layout/OrganizationLogo";
import { MemberForm } from "@/components/members/MemberForm";
import { MemberTransactions } from "@/components/members/MemberTransactions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useMember,
  useUpdateMember,
  useCreateMember,
  useDeleteMember,
} from "@/hooks/useMembers";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PendingInvite {
  memberId: string;
  email: string;
  firstName: string;
  navigateAfter: boolean;
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [isDirty, setIsDirty] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const { data: member, isLoading } = useMember(isNew ? undefined : id);
  const updateMember = useUpdateMember();
  const createMember = useCreateMember();
  const deleteMember = useDeleteMember();

  const {
    showDialog,
    handleNavigate,
    confirmNavigation,
    cancelNavigation,
  } = useUnsavedChangesWarning({ isDirty });

  const handleSubmit = async (data: any) => {
    if (isNew) {
      const result = await createMember.mutateAsync(data);
      setIsDirty(false);

      const grantsPortalAccess = (data.is_active_member || data.is_ambassador) && !!result.email;
      if (grantsPortalAccess) {
        setPendingInvite({
          memberId: result.id,
          email: result.email,
          firstName: result.first_name ?? "",
          navigateAfter: true,
        });
      } else {
        navigate(`/members/${result.id}`);
      }
    } else if (id) {
      // Detect if is_active_member / is_ambassador changed to true
      const wasActiveMember = member?.is_active_member ?? false;
      const isNowActiveMember = data.is_active_member ?? false;
      const wasAmbassador = member?.is_ambassador ?? false;
      const isNowAmbassador = data.is_ambassador ?? false;

      await updateMember.mutateAsync({ id, data });
      setIsDirty(false);

      // Send onboarding email if member just became active
      if (!wasActiveMember && isNowActiveMember && member?.email) {
        try {
          await supabase.functions.invoke("send-onboarding-email", {
            body: { memberId: id },
          });
        } catch (err) {
          console.error("Failed to send onboarding email:", err);
        }
      }

      const justGrantedPortalAccess =
        (!wasActiveMember && isNowActiveMember) || (!wasAmbassador && isNowAmbassador);
      const email = data.email ?? member?.email;
      if (justGrantedPortalAccess && email) {
        setPendingInvite({
          memberId: id,
          email,
          firstName: data.first_name ?? member?.first_name ?? "",
          navigateAfter: false,
        });
      }
    }
  };

  const handleInviteDialogChange = (open: boolean) => {
    if (!open && pendingInvite) {
      const { navigateAfter, memberId } = pendingInvite;
      setPendingInvite(null);
      if (navigateAfter) navigate(`/members/${memberId}`);
    }
  };

  const handleSendInvite = async () => {
    if (!pendingInvite) return;
    const { memberId, email } = pendingInvite;
    setIsSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke("send-member-invite", {
        body: { memberId },
      });
      if (error) throw error;
      toast.success(`Uitnodiging verstuurd naar ${email}`);
    } catch (err) {
      console.error("Failed to send member invite:", err);
      toast.error("Uitnodiging versturen is mislukt");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleBack = () => {
    handleNavigate(() => navigate("/members"));
  };

  const handleDelete = async () => {
    if (id && !isNew) {
      await deleteMember.mutateAsync(id);
      navigate("/members");
    }
  };

  if (isLoading && !isNew) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <OrganizationLogo size="lg" className="hidden sm:flex rounded-lg border bg-white p-1" />
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {isNew
                  ? "Nieuw lid"
                  : `${member?.first_name} ${member?.last_name}`}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? "Voeg een nieuw lid toe" : "Bewerk lidgegevens"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form="member-form"
              disabled={updateMember.isPending || createMember.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateMember.isPending || createMember.isPending ? "Opslaan..." : "Opslaan"}
            </Button>

            {!isNew && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Verwijderen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lid verwijderen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Weet je zeker dat je dit lid wilt verwijderen? Deze actie
                      kan niet ongedaan worden gemaakt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Verwijderen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Form */}
        <MemberForm
          member={member}
          onSubmit={handleSubmit}
          isLoading={updateMember.isPending || createMember.isPending}
          onDirtyChange={setIsDirty}
        />

        {/* Transactions Overview - only show for existing members */}
        {!isNew && id && (
          <MemberTransactions memberId={id} />
        )}
      </div>

      <AlertDialog open={!!pendingInvite} onOpenChange={handleInviteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uitnodigingsmail versturen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingInvite?.firstName || "Dit lid"} heeft nu toegang tot het ledenportaal. Wil je
              een uitnodigingsmail sturen naar {pendingInvite?.email} waarmee{" "}
              {pendingInvite?.firstName || "het lid"} kan inloggen en zelf een wachtwoord kan kiezen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Niet nu</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendInvite} disabled={isSendingInvite}>
              {isSendingInvite ? "Versturen..." : "Versturen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
