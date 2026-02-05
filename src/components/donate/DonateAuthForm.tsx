 import { useState } from "react";
 import { useAuthContext } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { PasswordInput } from "@/components/ui/password-input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { toast } from "sonner";
 import { Loader2, Mail, User } from "lucide-react";
 import { z } from "zod";
 
 const emailSchema = z.string().email("Ongeldig e-mailadres");
 const passwordSchema = z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn");
 
 export function DonateAuthForm() {
   const { signInWithPassword, signUp } = useAuthContext();
   
   const [isLoading, setIsLoading] = useState(false);
   const [activeTab, setActiveTab] = useState<"login" | "register">("register");
   
   // Login form
   const [loginEmail, setLoginEmail] = useState("");
   const [loginPassword, setLoginPassword] = useState("");
   
   // Register form
   const [registerEmail, setRegisterEmail] = useState("");
   const [registerPassword, setRegisterPassword] = useState("");
   const [firstName, setFirstName] = useState("");
   const [lastName, setLastName] = useState("");
 
   const handleLogin = async (e: React.FormEvent) => {
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
       } else if (error.message.includes("Email not confirmed")) {
         toast.error("Bevestig eerst je e-mailadres via de link in je inbox");
       } else {
         toast.error(error.message);
       }
     }
   };
 
   const handleRegister = async (e: React.FormEvent) => {
     e.preventDefault();
     
     try {
       emailSchema.parse(registerEmail);
       passwordSchema.parse(registerPassword);
     } catch (err) {
       if (err instanceof z.ZodError) {
         toast.error(err.errors[0].message);
       }
       return;
     }
 
     if (!firstName.trim() || !lastName.trim()) {
       toast.error("Vul je voor- en achternaam in");
       return;
     }
 
     setIsLoading(true);
     const { error } = await signUp(registerEmail, registerPassword, firstName.trim(), lastName.trim());
     setIsLoading(false);
 
     if (error) {
       if (error.message.includes("already registered")) {
         toast.error("Dit e-mailadres is al geregistreerd. Log in of gebruik een ander adres.");
       } else {
         toast.error(error.message);
       }
     } else {
       toast.success("Account aangemaakt! Check je e-mail om je registratie te bevestigen.");
     }
   };
 
   return (
     <Card className="card-elevated">
       <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
         <CardHeader>
           <TabsList className="grid w-full grid-cols-2">
             <TabsTrigger value="register">Registreren</TabsTrigger>
             <TabsTrigger value="login">Inloggen</TabsTrigger>
           </TabsList>
         </CardHeader>
         <CardContent>
           <TabsContent value="register" className="mt-0">
             <form onSubmit={handleRegister} className="space-y-4">
               <CardDescription className="mb-4">
                 Maak een account aan om te kunnen doneren
               </CardDescription>
               
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
 
               <div className="space-y-2">
                 <Label htmlFor="register-email">E-mailadres</Label>
                 <div className="relative">
                   <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="register-email"
                     type="email"
                     placeholder="naam@voorbeeld.nl"
                     className="pl-10"
                     value={registerEmail}
                     onChange={(e) => setRegisterEmail(e.target.value)}
                     required
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="register-password">Wachtwoord</Label>
                 <PasswordInput
                   id="register-password"
                   placeholder="Minimaal 6 tekens"
                   value={registerPassword}
                   onChange={(e) => setRegisterPassword(e.target.value)}
                   required
                 />
               </div>
 
               <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   "Account aanmaken"
                 )}
               </Button>
             </form>
           </TabsContent>
 
           <TabsContent value="login" className="mt-0">
             <form onSubmit={handleLogin} className="space-y-4">
               <CardDescription className="mb-4">
                 Log in met je bestaande account
               </CardDescription>
               
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
           </TabsContent>
         </CardContent>
       </Tabs>
     </Card>
   );
 }