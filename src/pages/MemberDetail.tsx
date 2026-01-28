import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MemberForm } from "@/components/members/MemberForm";
import { RoleManagement } from "@/components/members/RoleManagement";
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

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [isDirty, setIsDirty] = useState(false);

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
      navigate(`/members/${result.id}`);
    } else if (id) {
      await updateMember.mutateAsync({ id, data });
      setIsDirty(false);
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

        {/* Role Management - only for existing members */}
        {!isNew && member && (
          <RoleManagement 
            memberId={member.id} 
            authUserId={member.auth_user_id || null}
            isAdmin={member.is_admin ?? false}
            memberEmail={member.email}
          />
        )}

        {/* Form */}
        <MemberForm
          member={member}
          onSubmit={handleSubmit}
          isLoading={updateMember.isPending || createMember.isPending}
          onDirtyChange={setIsDirty}
        />
      </div>
    </MainLayout>
  );
}
