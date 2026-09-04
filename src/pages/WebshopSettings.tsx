import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Save, Truck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useShopSettings, useUpdateShopSettings } from "@/hooks/useShopSettings";

export default function WebshopSettings() {
  const { data: settings, isLoading } = useShopSettings();
  const updateSettings = useUpdateShopSettings();

  const [isLive, setIsLive] = useState(false);
  const [shippingCost, setShippingCost] = useState("0");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [confirmingGoLive, setConfirmingGoLive] = useState(false);

  useEffect(() => {
    if (settings) {
      setIsLive(settings.is_live);
      setShippingCost(String(settings.shipping_cost));
      setFreeShippingThreshold(
        settings.free_shipping_threshold != null ? String(settings.free_shipping_threshold) : ""
      );
    }
  }, [settings]);

  const handleToggleLive = (checked: boolean) => {
    if (checked) {
      setConfirmingGoLive(true);
    } else {
      setIsLive(false);
    }
  };

  const handleConfirmGoLive = () => {
    setIsLive(true);
    setConfirmingGoLive(false);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      is_live: isLive,
      shipping_cost: parseFloat(shippingCost) || 0,
      free_shipping_threshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Webshop-instellingen"
          description="Beheer de kill-switch en verzendinstellingen van de webshop"
          actions={
            <Button className="gap-2" onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4" />
              {updateSettings.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          }
        />

        <Card className={isLive ? "border-destructive" : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle
                className={isLive ? "h-5 w-5 text-destructive" : "h-5 w-5 text-amber-500"}
              />
              Webshop live zetten
            </CardTitle>
            <CardDescription>
              Zolang deze schakelaar uit staat, is de webshop nergens zichtbaar voor bezoekers — ook
              niet als producten gepubliceerd zijn. Zet deze pas aan wanneer de webshop volledig
              klaar is om te lanceren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={
                isLive
                  ? "flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-4"
                  : "flex items-center justify-between rounded-lg border p-4"
              }
            >
              <div>
                <p className="font-medium">
                  {isLive ? "Webshop staat live" : "Webshop staat offline"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLive
                    ? "Bezoekers kunnen gepubliceerde producten zien en bestellen."
                    : "Bezoekers zien niets van de webshop, ongeacht gepubliceerde producten."}
                </p>
              </div>
              <Switch checked={isLive} onCheckedChange={handleToggleLive} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-primary" />
              Verzending
            </CardTitle>
            <CardDescription>Standaard verzendkosten en gratis-verzendingsdrempel</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Verzendkosten (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gratis verzending vanaf (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Optioneel"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmingGoLive} onOpenChange={setConfirmingGoLive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Webshop live zetten?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit maakt gepubliceerde producten zichtbaar voor bezoekers zodra er een publieke
              storefront bestaat. Weet je zeker dat de webshop klaar is om live te gaan? Vergeet niet
              nadien op "Opslaan" te klikken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGoLive}>Ja, zet live</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
