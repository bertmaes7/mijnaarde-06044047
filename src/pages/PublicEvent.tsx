import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, MapPin, Users, Leaf, Check, Loader2 } from "lucide-react";
import {
  usePublicEvent,
  useEventRegistrationCount,
  useMyEventRegistration,
  useRegisterForEvent,
} from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

export default function PublicEvent() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = usePublicEvent(id);
  const { data: registrationCount } = useEventRegistrationCount(id);
  const { data: myRegistration, refetch: refetchMyRegistration } = useMyEventRegistration(id);
  const registerForEvent = useRegisterForEvent();

  const [user, setUser] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [registerData, setRegisterData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Get member ID
        const { data } = await supabase.rpc("get_my_member_id");
        setMemberId(data);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          const { data } = await supabase.rpc("get_my_member_id");
          setMemberId(data);
          refetchMyRegistration();
        }, 0);
      } else {
        setMemberId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refetchMyRegistration]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      toast.error(error.message === "Invalid login credentials" 
        ? "Ongeldige inloggegevens" 
        : error.message);
    } else {
      toast.success("Ingelogd!");
    }
    setIsLoggingIn(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    const { error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/events/${id}`,
        data: {
          first_name: registerData.first_name,
          last_name: registerData.last_name,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account aangemaakt! Je kunt je nu inschrijven.");
    }
    setIsRegistering(false);
  };

  const handleEventRegistration = async () => {
    if (!id || !memberId) return;
    registerForEvent.mutate({ eventId: id, memberId });
  };

  if (eventLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Event niet gevonden</h1>
          <p className="text-muted-foreground mb-8">
            Dit event bestaat niet of is niet meer beschikbaar.
          </p>
          <Button asChild>
            <Link to="/">Naar homepagina</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPast = new Date(event.event_date) < new Date();
  const spotsLeft = event.max_participants ? event.max_participants - (registrationCount || 0) : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isRegistered = myRegistration?.status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-earth">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Mijn Aarde</span>
          </Link>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => supabase.auth.signOut()}
              >
                Uitloggen
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isPast ? (
                  <Badge variant="secondary">Afgelopen</Badge>
                ) : isFull ? (
                  <Badge variant="destructive">Volzet</Badge>
                ) : (
                  <Badge variant="default">Open voor inschrijving</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">{event.title}</h1>
              
              <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(new Date(event.event_date), "EEEE d MMMM yyyy", { locale: nl })}</span>
                  <span>om {format(new Date(event.event_date), "HH:mm", { locale: nl })} uur</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {registrationCount} inschrijving{registrationCount !== 1 ? "en" : ""}
                    {event.max_participants && ` (max. ${event.max_participants})`}
                  </span>
                </div>
              </div>
            </div>

            {event.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Over dit event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{event.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Registration Card */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Inschrijven</CardTitle>
                <CardDescription>
                  {isPast
                    ? "Dit event is al afgelopen"
                    : isFull
                    ? "Dit event is volzet"
                    : "Schrijf je in voor dit event"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPast || isFull ? (
                  <p className="text-muted-foreground text-center py-4">
                    {isPast ? "Inschrijven niet meer mogelijk" : "Geen plaatsen meer beschikbaar"}
                  </p>
                ) : isRegistered ? (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Je bent ingeschreven!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We zien je op {format(new Date(event.event_date), "d MMMM", { locale: nl })}
                    </p>
                  </div>
                ) : user && memberId ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Je bent ingelogd als <strong>{user.email}</strong>
                    </p>
                    <Button
                      className="w-full"
                      onClick={handleEventRegistration}
                      disabled={registerForEvent.isPending}
                    >
                      {registerForEvent.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig...
                        </>
                      ) : (
                        "Schrijf me in"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Inloggen</TabsTrigger>
                      <TabsTrigger value="register">Registreren</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login" className="space-y-4 mt-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">E-mail</Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Wachtwoord</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoggingIn}>
                          {isLoggingIn ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Bezig...
                            </>
                          ) : (
                            "Inloggen"
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                    <TabsContent value="register" className="space-y-4 mt-4">
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="first-name">Voornaam</Label>
                            <Input
                              id="first-name"
                              value={registerData.first_name}
                              onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last-name">Achternaam</Label>
                            <Input
                              id="last-name"
                              value={registerData.last_name}
                              onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email">E-mail</Label>
                          <Input
                            id="register-email"
                            type="email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Wachtwoord</Label>
                          <Input
                            id="register-password"
                            type="password"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            minLength={6}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isRegistering}>
                          {isRegistering ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Bezig...
                            </>
                          ) : (
                            "Registreren"
                          )}
                        </Button>
                      </form>
                      <p className="text-xs text-muted-foreground text-center">
                        Door te registreren word je ook opgeslagen als contact.
                      </p>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
