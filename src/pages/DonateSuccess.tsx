import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { OrganizationLogo } from "@/components/layout/OrganizationLogo";
export default function DonateSuccess() {
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get("donation_id");
   
   const [status, setStatus] = useState<"loading" | "paid" | "pending" | "failed">("loading");
   const [amount, setAmount] = useState<number | null>(null);
 
   useEffect(() => {
     if (!donationId) {
       setStatus("failed");
       return;
     }
 
     const checkDonation = async () => {
       // Poll for a few seconds to allow webhook to update
       let attempts = 0;
       const maxAttempts = 10;
       
       const poll = async () => {
         const { data, error } = await supabase
           .from("donations")
           .select("status, amount")
           .eq("id", donationId)
           .single();
 
         if (error) {
           console.error("Error fetching donation:", error);
           setStatus("failed");
           return;
         }
 
         setAmount(data.amount);
 
         if (data.status === "paid") {
           setStatus("paid");
         } else if (data.status === "failed") {
           setStatus("failed");
         } else if (attempts < maxAttempts) {
           attempts++;
           setTimeout(poll, 1000);
         } else {
           // Still pending after polling
           setStatus("pending");
         }
       };
 
       poll();
     };
 
     checkDonation();
   }, [donationId]);
 
   return (
     <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md space-y-6">
        {/* Logo */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <OrganizationLogo size="lg" className="h-20 w-20" />
            </div>
            <h1 className="font-display text-3xl font-bold">Mijn Aarde</h1>
          </div>
 
         <Card className="card-elevated">
           <CardHeader className="text-center">
             {status === "loading" && (
               <>
                 <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
                 <CardTitle>Betaling verwerken...</CardTitle>
                 <CardDescription>Even geduld terwijl we je betaling controleren</CardDescription>
               </>
             )}
 
             {status === "paid" && (
               <>
                 <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                   <CheckCircle className="h-8 w-8 text-green-600" />
                 </div>
                 <CardTitle className="text-green-600">Bedankt voor je donatie!</CardTitle>
                 <CardDescription>
                   Je donatie van €{amount?.toFixed(2)} is succesvol ontvangen
                 </CardDescription>
               </>
             )}
 
             {status === "pending" && (
               <>
                 <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                   <Clock className="h-8 w-8 text-yellow-600" />
                 </div>
                 <CardTitle className="text-yellow-600">Betaling in behandeling</CardTitle>
                 <CardDescription>
                   Je betaling wordt nog verwerkt. Je ontvangt een bevestiging zodra de betaling is voltooid.
                 </CardDescription>
               </>
             )}
 
             {status === "failed" && (
               <>
                 <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                   <XCircle className="h-8 w-8 text-red-600" />
                 </div>
                 <CardTitle className="text-red-600">Betaling niet gelukt</CardTitle>
                 <CardDescription>
                   De betaling kon niet worden verwerkt. Probeer het opnieuw.
                 </CardDescription>
               </>
             )}
           </CardHeader>
           <CardContent className="space-y-4">
             {status === "paid" && (
               <p className="text-center text-sm text-muted-foreground">
                 Dankzij jouw steun kunnen wij ons werk voortzetten voor een duurzamere wereld.
               </p>
             )}
 
             <div className="flex flex-col gap-2">
               <Button asChild>
                 <Link to="/donate">
                   {status === "failed" ? "Opnieuw proberen" : "Nog een donatie doen"}
                 </Link>
               </Button>
               <Button variant="ghost" asChild>
                 <a href="https://mijnaarde.com" target="_blank" rel="noopener noreferrer">
                   Naar mijnaarde.com
                 </a>
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }