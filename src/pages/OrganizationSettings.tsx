import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Image, Building2, Users, CreditCard, Calendar, Loader2 } from "lucide-react";
import {
  useMailingAssets,
  useUpdateMailingAsset,
} from "@/hooks/useMailing";
import { LogoUpload } from "@/components/mailing/LogoUpload";
import { toast } from "sonner";

// Define the order and grouping of organization fields
const fieldGroups = {
  basic: ["org_name", "org_enterprise_number"],
  address: ["org_address", "org_postal_code", "org_city", "org_country"],
  directors: [
    { name: "org_director_1", rrn: "org_director_1_rrn" },
    { name: "org_director_2", rrn: "org_director_2_rrn" },
    { name: "org_director_3", rrn: "org_director_3_rrn" },
    { name: "org_director_4", rrn: "org_director_4_rrn" },
  ],
  banking: ["org_bank_account_1", "org_bank_account_2"],
  fiscal: ["org_fiscal_year_start", "org_fiscal_year_end"],
};

export default function OrganizationSettings() {
  const { data: assets, isLoading } = useMailingAssets();
  const updateAsset = useUpdateMailingAsset();

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const organizationAssets = assets?.filter((a) => a.type === "organization") || [];
  const logoAsset = assets?.find((a) => a.type === "logo");
  const logoUrl = logoAsset ? (editedValues[logoAsset.id] ?? logoAsset.value) : "";

  const getAssetByKey = (key: string) => organizationAssets.find((a) => a.key === key);
  
  const getAssetsByKeys = (keys: string[]) => {
    return keys
      .map((key) => getAssetByKey(key))
      .filter(Boolean) as typeof organizationAssets;
  };

  const basicAssets = getAssetsByKeys(fieldGroups.basic);
  const addressAssets = getAssetsByKeys(fieldGroups.address);
  const bankingAssets = getAssetsByKeys(fieldGroups.banking);
  const fiscalAssets = getAssetsByKeys(fieldGroups.fiscal);

  const hasChanges = useMemo(() => Object.keys(editedValues).length > 0, [editedValues]);

  const handleValueChange = (id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveAll = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const updates = Object.entries(editedValues).map(([id, value]) => 
        updateAsset.mutateAsync({ id, value })
      );
      await Promise.all(updates);
      setEditedValues({});
      toast.success("Alle wijzigingen opgeslagen");
    } catch (error) {
      toast.error("Fout bij opslaan van wijzigingen");
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (asset: typeof organizationAssets[0], placeholder?: string) => (
    <div key={asset.id} className="space-y-2">
      <Label>{asset.label}</Label>
      <Input
        value={editedValues[asset.id] ?? asset.value}
        onChange={(e) => handleValueChange(asset.id, e.target.value)}
        placeholder={placeholder || `Vul ${asset.label.toLowerCase()} in...`}
      />
    </div>
  );

  const renderCardTitle = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-3">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="h-8 w-8 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {icon}
      <span>{title}</span>
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
        {/* Header with logo and save button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Mijn Aarde Logo" 
                className="h-16 w-16 object-contain rounded-lg border bg-white p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Organisatie-instellingen</h1>
              <p className="text-muted-foreground">
                Beheer logo en organisatiegegevens van Mijn Aarde vzw
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSaveAll} 
            disabled={!hasChanges || isSaving}
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Opslaan
          </Button>
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
                  {logoUrl && (
                    <div className="p-4 bg-muted rounded-lg">
                      <img
                        src={logoUrl}
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
                    }}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Of voer een URL in</Label>
                    <Input
                      value={editedValues[logoAsset.id] ?? logoAsset.value}
                      onChange={(e) => handleValueChange(logoAsset.id, e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Basic Organization Details */}
          <Card>
            <CardHeader>
              <CardTitle>{renderCardTitle(<Building2 className="h-5 w-5" />, "Basisgegevens")}</CardTitle>
              <CardDescription>Naam en identificatie van de vzw</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {basicAssets.map((asset) => renderField(asset))}
            </CardContent>
          </Card>

          {/* Registered Address */}
          <Card>
            <CardHeader>
              <CardTitle>{renderCardTitle(<Building2 className="h-5 w-5" />, "Maatschappelijke Zetel")}</CardTitle>
              <CardDescription>Volledig adres van de maatschappelijke zetel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressAssets.map((asset) => renderField(asset))}
            </CardContent>
          </Card>

          {/* Directors with RRN */}
          <Card>
            <CardHeader>
              <CardTitle>{renderCardTitle(<Users className="h-5 w-5" />, "Gemandateerde Bestuurders")}</CardTitle>
              <CardDescription>Maximaal 4 bestuurders met mandaat en rijksregisternummer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fieldGroups.directors.map((director, index) => {
                const nameAsset = getAssetByKey(director.name);
                const rrnAsset = getAssetByKey(director.rrn);
                
                if (!nameAsset) return null;
                
                return (
                  <div key={director.name} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <h4 className="font-medium text-sm text-muted-foreground">Bestuurder {index + 1}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Naam</Label>
                        <Input
                          value={editedValues[nameAsset.id] ?? nameAsset.value}
                          onChange={(e) => handleValueChange(nameAsset.id, e.target.value)}
                          placeholder="Volledige naam..."
                        />
                      </div>
                      {rrnAsset && (
                        <div className="space-y-2">
                          <Label>Rijksregisternummer</Label>
                          <Input
                            value={editedValues[rrnAsset.id] ?? rrnAsset.value}
                            onChange={(e) => handleValueChange(rrnAsset.id, e.target.value)}
                            placeholder="00.00.00-000.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>{renderCardTitle(<CreditCard className="h-5 w-5" />, "Bankrekeningnummers")}</CardTitle>
              <CardDescription>IBAN-nummers van de organisatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankingAssets.map((asset) => renderField(asset, "BE00 0000 0000 0000"))}
            </CardContent>
          </Card>

          {/* Fiscal Year */}
          <Card>
            <CardHeader>
              <CardTitle>{renderCardTitle(<Calendar className="h-5 w-5" />, "Boekjaar")}</CardTitle>
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
