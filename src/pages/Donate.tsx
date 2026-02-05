import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Heart, Mail, User, ArrowLeft } from "lucide-react";
import { OrganizationLogo } from "@/components/layout/OrganizationLogo";
import { z } from "zod";

const emailSchema = z.string().email("Ongeldig e-mailadres");

type Step = "email" | "register" | "payment";

interface DonorInfo {
  email: string;
  firstName: string;
  lastName: string;
  isExistingMember: boolean;
}

export default function Donate() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [donorInfo, setDonorInfo] = useState<DonorInfo | null>(null);

  const presetAmounts = [7, 49, 77, 777];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Ongeldig e-mailadres");
      return;
    }

    setIsCheckingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-member-email", {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) throw error;

      if (data?.exists) {
        // Existing member - go directly to payment
        setDonorInfo({
          email: email.toLowerCase().trim(),
          firstName: data.firstName,
          lastName: data.lastName,
          isExistingMember: true,
        });
        setStep("payment");
        toast.success(`Welkom terug, ${data.firstName}!`);
      } else {
        // New user - need to collect name
        setStep("register");
      }
    } catch (err) {
      console.error("Error checking email:", err);
      toast.error("Er ging iets mis bij het controleren van je e-mailadres");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Vul je voor- en achternaam in");
      return;
    }

    setDonorInfo({
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isExistingMember: false,
    });
    setStep("payment");
  };

  const handleDonate = async () => {
    if (!donorInfo) return;

    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount < 1) {
      toast.error("Voer een bedrag van minimaal €1 in");
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-mollie-payment", {
        body: { 
          amount: numericAmount,
          description: "Donatie aan Mijn Aarde",
          email: donorInfo.email,
          firstName: donorInfo.firstName,
          lastName: donorInfo.lastName,
        },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Geen checkout URL ontvangen");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Er ging iets mis bij het aanmaken van de betaling");
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (step === "register") {
      setStep("email");
    } else if (step === "payment") {
      if (donorInfo?.isExistingMember) {
        setStep("email");
        setDonorInfo(null);
      } else {
        setStep("register");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <OrganizationLogo size="lg" />
          </div>
          <h1 className="font-display text-3xl font-bold">Mijn Aarde</h1>
          <p className="mt-2 text-muted-foreground">Steun ons met een donatie</p>
        </div>

        {/* Step 1: Email */}
        {step === "email" && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Doneren</CardTitle>
              <CardDescription>
                Vul je e-mailadres in om te beginnen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isCheckingEmail}>
                  {isCheckingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Doorgaan"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Register (new users only) */}
        {step === "register" && (
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Welkom!</CardTitle>
                  <CardDescription>
                    Vul je naam in om door te gaan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  E-mailadres: <strong>{email}</strong>
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
                        required
                        autoFocus
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
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Doorgaan naar betaling
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && donorInfo && (
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
              <CardTitle>Doneer nu</CardTitle>
              <CardDescription>
                Hallo {donorInfo.firstName}, kies een bedrag of voer een eigen bedrag in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset amounts */}
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === String(preset) ? "default" : "outline"}
                    onClick={() => setAmount(String(preset))}
                    className="h-12"
                  >
                    €{preset}
                  </Button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Of kies je eigen bedrag</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground">€</span>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-8"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Donate button */}
              <Button
                className="w-full h-12 text-lg"
                onClick={handleDonate}
                disabled={isProcessing || !amount || parseFloat(amount) < 1}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Heart className="mr-2 h-5 w-5" />
                    Doneer {amount && parseFloat(amount) >= 1 ? `€${parseFloat(amount).toFixed(2)}` : ""}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Je wordt doorgestuurd naar een beveiligde betaalpagina
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
