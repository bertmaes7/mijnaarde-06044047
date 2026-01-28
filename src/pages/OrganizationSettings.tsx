import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Image, Building2 } from "lucide-react";
import {
  useMailingAssets,
  useUpdateMailingAsset,
} from "@/hooks/useMailing";
import { LogoUpload } from "@/components/mailing/LogoUpload";

export default function OrganizationSettings() {
  const { data: assets, isLoading } = useMailingAssets();
  const updateAsset = useUpdateMailingAsset();

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const organizationAssets = assets?.filter((a) => a.type === "organization") || [];
  const logoAsset = assets?.find((a) => a.type === "logo");

  const handleValueChange = (id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    if (editedValues[id] !== undefined) {
      updateAsset.mutate({ id, value: editedValues[id] });
      setEditedValues((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organisatie-instellingen</h1>
          <p className="text-muted-foreground">
            Beheer logo en organisatiegegevens van Mijn Aarde vzw
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo
              </CardTitle>
              <CardDescription>Upload of link naar het Mijn Aarde logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoAsset && (
                <>
                  {(editedValues[logoAsset.id] ?? logoAsset.value) && (
                    <div className="p-4 bg-muted rounded-lg">
                      <img
                        src={editedValues[logoAsset.id] ?? logoAsset.value}
                        alt="Logo preview"
                        className="max-h-24 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <LogoUpload
                    onUpload={(url) => {
                      handleValueChange(logoAsset.id, url);
                      // Auto-save after upload
                      updateAsset.mutate({ id: logoAsset.id, value: url });
                    }}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Of voer een URL in</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editedValues[logoAsset.id] ?? logoAsset.value}
                        onChange={(e) => handleValueChange(logoAsset.id, e.target.value)}
                        placeholder="https://..."
                      />
                      <Button
                        size="icon"
                        onClick={() => handleSave(logoAsset.id)}
                        disabled={editedValues[logoAsset.id] === undefined || updateAsset.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Organization Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organisatiegegevens
              </CardTitle>
              <CardDescription>Gegevens van Mijn Aarde vzw</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organizationAssets.map((asset) => (
                <div key={asset.id} className="space-y-2">
                  <Label>{asset.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editedValues[asset.id] ?? asset.value}
                      onChange={(e) => handleValueChange(asset.id, e.target.value)}
                      placeholder={`Vul ${asset.label.toLowerCase()} in...`}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSave(asset.id)}
                      disabled={editedValues[asset.id] === undefined || updateAsset.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
