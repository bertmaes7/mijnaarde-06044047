import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Image, Building2, Users, CreditCard, Calendar } from "lucide-react";
import {
  useMailingAssets,
  useUpdateMailingAsset,
} from "@/hooks/useMailing";
import { LogoUpload } from "@/components/mailing/LogoUpload";

// Define the order and grouping of organization fields
const fieldGroups = {
  basic: ["org_name", "org_enterprise_number"],
  address: ["org_address", "org_postal_code", "org_city", "org_country"],
  directors: ["org_director_1", "org_director_2", "org_director_3", "org_director_4"],
  banking: ["org_bank_account_1", "org_bank_account_2"],
  fiscal: ["org_fiscal_year_start", "org_fiscal_year_end"],
};

export default function OrganizationSettings() {
  const { data: assets, isLoading } = useMailingAssets();
  const updateAsset = useUpdateMailingAsset();

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const organizationAssets = assets?.filter((a) => a.type === "organization") || [];
  const logoAsset = assets?.find((a) => a.type === "logo");

  const getAssetsByKeys = (keys: string[]) => {
    return keys
      .map((key) => organizationAssets.find((a) => a.key === key))
      .filter(Boolean) as typeof organizationAssets;
  };

  const basicAssets = getAssetsByKeys(fieldGroups.basic);
  const addressAssets = getAssetsByKeys(fieldGroups.address);
  const directorAssets = getAssetsByKeys(fieldGroups.directors);
  const bankingAssets = getAssetsByKeys(fieldGroups.banking);
  const fiscalAssets = getAssetsByKeys(fieldGroups.fiscal);

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

  const renderField = (asset: typeof organizationAssets[0], placeholder?: string) => (
    <div key={asset.id} className="space-y-2">
      <Label>{asset.label}</Label>
      <div className="flex gap-2">
        <Input
          value={editedValues[asset.id] ?? asset.value}
          onChange={(e) => handleValueChange(asset.id, e.target.value)}
          placeholder={placeholder || `Vul ${asset.label.toLowerCase()} in...`}
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
  );

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

        <div className="grid gap-6 lg:grid-cols-2">
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

          {/* Basic Organization Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basisgegevens
              </CardTitle>
              <CardDescription>Naam en identificatie van de vzw</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {basicAssets.map((asset) => renderField(asset))}
            </CardContent>
          </Card>

          {/* Registered Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Maatschappelijke Zetel
              </CardTitle>
              <CardDescription>Volledig adres van de maatschappelijke zetel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressAssets.map((asset) => renderField(asset))}
            </CardContent>
          </Card>

          {/* Directors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gemandateerde Bestuurders
              </CardTitle>
              <CardDescription>Maximaal 4 bestuurders met mandaat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {directorAssets.map((asset) => renderField(asset, "Naam bestuurder..."))}
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bankrekeningnummers
              </CardTitle>
              <CardDescription>IBAN-nummers van de organisatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankingAssets.map((asset) => renderField(asset, "BE00 0000 0000 0000"))}
            </CardContent>
          </Card>

          {/* Fiscal Year */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Boekjaar
              </CardTitle>
              <CardDescription>Start- en einddatum van het huidig boekjaar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fiscalAssets.map((asset) => renderField(asset, "DD/MM/YYYY"))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
