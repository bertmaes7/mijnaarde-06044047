import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, User, CheckCircle } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Ongeldig e-mailadres");

export function DonateAuthForm() {
  const { signInWithMagicLinkAndData } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [existingMember, setExistingMember] = useState<{ firstName: string; lastName: string } | null>(null);
  
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const checkExistingMember = async (emailToCheck: string) => {
    if (!emailToCheck.trim()) return;
    
    try {
      emailSchema.parse(emailToCheck);
    } catch {
      return;
    }

    setIsCheckingEmail(true);
    try {
      // Use edge function to check member (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("check-member-email", {
        body: { email: emailToCheck.toLowerCase().trim() },
      });

      if (!error && data?.exists) {
        setExistingMember({ firstName: data.firstName, lastName: data.lastName });
        setFirstName(data.firstName);
        setLastName(data.lastName);
        toast.info(`Welkom terug, ${data.firstName}!`);
      } else {
        setExistingMember(null);
      }
    } catch (err) {
      console.error("Error checking email:", err);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Ongeldig e-mailadres");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Vul je voor- en achternaam in");
      return;
    }

    setIsLoading(true);
    
    const { error } = await signInWithMagicLinkAndData(
      email.toLowerCase().trim(),
      firstName.trim(),
      lastName.trim()
    );
    
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setEmailSent(true);
      toast.success("Check je e-mail voor de login-link!");
    }
  };

  if (emailSent) {
    return (
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Check je e-mail</h3>
              <p className="text-muted-foreground mt-2">
                We hebben een login-link gestuurd naar <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Klik op de link in de e-mail om verder te gaan met je donatie.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEmailSent(false);
                setEmail("");
                setFirstName("");
                setLastName("");
                setExistingMember(null);
              }}
            >
              Ander e-mailadres gebruiken
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Doneren</CardTitle>
        <CardDescription>
          Vul je gegevens in om te doneren. We sturen je een login-link per e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="naam@voorbeeld.nl"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => checkExistingMember(e.target.value)}
                required
              />
              {isCheckingEmail && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="Jan"
                  className="pl-10"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!!existingMember}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Achternaam</Label>
              <Input
                id="lastName"
                placeholder="Jansen"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!!existingMember}
                required
              />
            </div>
          </div>

          {existingMember && (
            <p className="text-sm text-muted-foreground">
              We hebben je gevonden in ons systeem. Je ontvangt een login-link per e-mail.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verstuur login-link"
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Geen wachtwoord nodig. We sturen je een veilige login-link per e-mail.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
