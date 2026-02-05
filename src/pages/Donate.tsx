 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { useAuthContext } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { toast } from "sonner";
 import { Leaf, Loader2, Heart, LogOut } from "lucide-react";
 import { DonateAuthForm } from "@/components/donate/DonateAuthForm";
 import { useOrganizationLogo } from "@/hooks/useOrganizationLogo";
 
 export default function Donate() {
   const navigate = useNavigate();
   const { user, isLoading: authLoading, signOut } = useAuthContext();
   const logoUrl = useOrganizationLogo();
   
   const [amount, setAmount] = useState<string>("");
   const [isProcessing, setIsProcessing] = useState(false);
 
   const presetAmounts = [7, 49, 77, 777];
 
   const handleDonate = async () => {
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
           description: "Donatie aan Mijn Aarde" 
         },
       });
 
       if (error) throw error;
 
       if (data?.checkout_url) {
         // Redirect to Mollie checkout
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
 
   const handleSignOut = async () => {
     await signOut();
     toast.success("Uitgelogd");
   };
 
   if (authLoading) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md space-y-6">
         {/* Logo */}
         <div className="text-center">
           {logoUrl ? (
             <img
               src={logoUrl}
               alt="Mijn Aarde"
               className="mx-auto mb-4 h-20 w-auto object-contain"
             />
           ) : (
             <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl gradient-earth">
               <Leaf className="h-10 w-10 text-primary-foreground" />
             </div>
           )}
           <h1 className="font-display text-3xl font-bold">Mijn Aarde</h1>
           <p className="mt-2 text-muted-foreground">Steun ons met een donatie</p>
         </div>
 
         {!user ? (
           <DonateAuthForm />
         ) : (
           <Card className="card-elevated">
             <CardHeader className="text-center">
               <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                 <Heart className="h-6 w-6 text-primary" />
               </div>
               <CardTitle>Doneer nu</CardTitle>
               <CardDescription>
                 Kies een bedrag of voer een eigen bedrag in
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
 
               <div className="text-center">
                 <Button variant="ghost" size="sm" onClick={handleSignOut}>
                   <LogOut className="mr-2 h-4 w-4" />
                   Uitloggen
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}
       </div>
     </div>
   );
 }