import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Image, Building2, FileText } from "lucide-react";
import {
  useMailingAssets,
  useUpdateMailingAsset,
  useCreateMailingAsset,
  useDeleteMailingAsset,
} from "@/hooks/useMailing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MailingAssets() {
  const { data: assets, isLoading } = useMailingAssets();
  const updateAsset = useUpdateMailingAsset();
  const createAsset = useCreateMailingAsset();
  const deleteAsset = useDeleteMailingAsset();

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [newTextBlock, setNewTextBlock] = useState({ key: "", label: "", value: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const organizationAssets = assets?.filter((a) => a.type === "organization") || [];
  const logoAsset = assets?.find((a) => a.type === "logo");
  const textAssets = assets?.filter((a) => a.type === "text") || [];

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

  const handleCreateTextBlock = () => {
    if (!newTextBlock.key || !newTextBlock.label) return;
    createAsset.mutate({
      key: `text_${newTextBlock.key}`,
      label: newTextBlock.label,
      type: "text",
      value: newTextBlock.value,
    });
    setNewTextBlock({ key: "", label: "", value: "" });
    setIsDialogOpen(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Assets & Gegevens</h1>
          <p className="text-muted-foreground">
            Beheer logo, organisatiegegevens en herbruikbare tekstblokken
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
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={editedValues[logoAsset.id] ?? logoAsset.value}
                      onChange={(e) => handleValueChange(logoAsset.id, e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
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
                  <Button
                    onClick={() => handleSave(logoAsset.id)}
                    disabled={editedValues[logoAsset.id] === undefined || updateAsset.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Opslaan
                  </Button>
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

        {/* Text Blocks Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Herbruikbare Tekstblokken
              </CardTitle>
              <CardDescription>
                Maak tekstblokken die je in templates kunt gebruiken met {"{{key}}"}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuw tekstblok
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuw tekstblok</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sleutel (key)</Label>
                    <Input
                      value={newTextBlock.key}
                      onChange={(e) =>
                        setNewTextBlock({ ...newTextBlock, key: e.target.value.toLowerCase().replace(/\s/g, "_") })
                      }
                      placeholder="bijv. footer_tekst"
                    />
                    <p className="text-xs text-muted-foreground">
                      Gebruik in templates: {"{{text_" + (newTextBlock.key || "key") + "}}"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={newTextBlock.label}
                      onChange={(e) => setNewTextBlock({ ...newTextBlock, label: e.target.value })}
                      placeholder="bijv. Footer tekst"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inhoud</Label>
                    <Textarea
                      value={newTextBlock.value}
                      onChange={(e) => setNewTextBlock({ ...newTextBlock, value: e.target.value })}
                      placeholder="Voer de tekst in..."
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleCreateTextBlock} disabled={!newTextBlock.key || !newTextBlock.label}>
                    Aanmaken
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {textAssets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen tekstblokken. Maak er een aan om te beginnen.
              </p>
            ) : (
              <div className="space-y-4">
                {textAssets.map((asset) => (
                  <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{asset.label}</h4>
                        <code className="text-xs text-muted-foreground bg-muted px-1 rounded">
                          {`{{${asset.key}}}`}
                        </code>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tekstblok verwijderen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dit kan niet ongedaan worden gemaakt. Templates die dit blok gebruiken zullen de placeholder
                              tonen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAsset.mutate(asset.id)}>
                              Verwijderen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Textarea
                      value={editedValues[asset.id] ?? asset.value}
                      onChange={(e) => handleValueChange(asset.id, e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(asset.id)}
                      disabled={editedValues[asset.id] === undefined || updateAsset.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Opslaan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
