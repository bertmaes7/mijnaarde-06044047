import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Leaf, Loader2, Mail, Sparkles } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Ongeldig e-mailadres");

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, passwordChangeRequired, signInWithPassword, signInWithMagicLink } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check if password change is required first
      if (passwordChangeRequired) {
        navigate("/change-password", { replace: true });
        return;
      }
      
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (isAdmin) {
        navigate("/", { replace: true });
      } else {
        // Non-admins cannot access the app - sign them out
        toast.error("Alleen beheerders kunnen inloggen");
      }
    }
  }, [user, isAdmin, passwordChangeRequired, navigate, location.state]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
    } catch {
      toast.error("Ongeldig e-mailadres");
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithPassword(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Ongeldige inloggegevens");
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
    } catch {
      toast.error("Ongeldig e-mailadres");
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithMagicLink(loginEmail);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success("Magic link verzonden! Check je e-mail.");
    }
  };

  if (magicLinkSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md card-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-earth">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Check je e-mail</CardTitle>
            <CardDescription>
              We hebben een magic link gestuurd naar <strong>{loginEmail}</strong>. 
              Klik op de link in de e-mail om in te loggen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              Terug naar inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md card-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-earth">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Mijn Aarde</CardTitle>
          <CardDescription>
            Log in met je beheerdersaccount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  className="pl-10"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Wachtwoord</Label>
              <PasswordInput
                id="login-password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Inloggen"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Of</span>
            </div>
          </div>

          <form onSubmit={handleMagicLink}>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={isLoading || !loginEmail}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Verstuur Magic Link
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Geen account? Neem contact op met een beheerder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
