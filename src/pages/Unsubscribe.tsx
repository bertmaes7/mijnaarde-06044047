import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "confirming" | "success" | "error">("confirming");
  const [errorMessage, setErrorMessage] = useState("");

  const memberId = searchParams.get("id");
  const token = searchParams.get("token");

  const handleUnsubscribe = async () => {
    if (!memberId || !token) {
      setStatus("error");
      setErrorMessage("Ongeldige uitschrijflink");
      return;
    }

    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("unsubscribe", {
        body: { memberId, token },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Er is een fout opgetreden");
    }
  };

  if (!memberId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Ongeldige link</CardTitle>
            <CardDescription>
              Deze uitschrijflink is ongeldig of verlopen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {status === "confirming" && (
          <>
            <CardHeader className="text-center">
              <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Uitschrijven</CardTitle>
              <CardDescription>
                Weet je zeker dat je je wilt uitschrijven van onze mailinglijst?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={handleUnsubscribe} variant="destructive">
                Ja, schrijf me uit
              </Button>
              <Button variant="outline" onClick={() => window.close()}>
                Annuleren
              </Button>
            </CardContent>
          </>
        )}

        {status === "loading" && (
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <CardTitle>Bezig met uitschrijven...</CardTitle>
            <CardDescription>Even geduld alsjeblieft.</CardDescription>
          </CardHeader>
        )}

        {status === "success" && (
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Uitgeschreven</CardTitle>
            <CardDescription>
              Je bent succesvol uitgeschreven van onze mailinglijst. 
              Je ontvangt geen e-mails meer van ons.
            </CardDescription>
          </CardHeader>
        )}

        {status === "error" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Fout</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleUnsubscribe} variant="outline" className="w-full">
                Opnieuw proberen
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
