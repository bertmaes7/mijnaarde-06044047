import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal één hoofdletter bevatten")
      .regex(/[a-z]/, "Wachtwoord moet minimaal één kleine letter bevatten")
      .regex(/[0-9]/, "Wachtwoord moet minimaal één cijfer bevatten"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ChangePassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      // Get current user to find their member record
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear the password_change_required flag
        const { error: memberUpdateError } = await supabase
          .from("members")
          .update({ password_change_required: false })
          .eq("auth_user_id", user.id);

        if (memberUpdateError) {
          console.error("Error updating member:", memberUpdateError);
        }
      }

      toast.success("Wachtwoord succesvol gewijzigd. U wordt uitgelogd om opnieuw in te loggen.");
      
      // Sign out and redirect to login - this ensures a clean state
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error instanceof Error ? error.message : "Fout bij wijzigen wachtwoord");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Wachtwoord wijzigen</CardTitle>
          <CardDescription>
            Kies een nieuw wachtwoord om door te gaan. Dit is vereist bij uw eerste inlog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nieuw wachtwoord</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bevestig wachtwoord</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-xs text-muted-foreground">
                <p>Wachtwoord moet bevatten:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Minimaal 8 tekens</li>
                  <li>Minimaal één hoofdletter</li>
                  <li>Minimaal één kleine letter</li>
                  <li>Minimaal één cijfer</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wijzigen...
                  </>
                ) : (
                  "Wachtwoord wijzigen"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
