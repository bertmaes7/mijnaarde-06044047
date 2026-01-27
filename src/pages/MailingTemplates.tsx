import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Save, FileCode, Eye, ArrowLeft, FileText } from "lucide-react";
import {
  useMailingTemplates,
  useCreateMailingTemplate,
  useUpdateMailingTemplate,
  useDeleteMailingTemplate,
  useMailingAssets,
  MailingTemplate,
} from "@/hooks/useMailing";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const placeholderHelp = [
  { placeholder: "{{voornaam}}", description: "Voornaam van het lid" },
  { placeholder: "{{achternaam}}", description: "Achternaam van het lid" },
  { placeholder: "{{naam}}", description: "Volledige naam" },
  { placeholder: "{{email}}", description: "E-mailadres" },
  { placeholder: "{{org_name}}", description: "Organisatienaam" },
  { placeholder: "{{logo_url}}", description: "Logo URL" },
];

export default function MailingTemplates() {
  const { data: templates, isLoading } = useMailingTemplates();
  const { data: assets } = useMailingAssets();
  const createTemplate = useCreateMailingTemplate();
  const updateTemplate = useUpdateMailingTemplate();
  const deleteTemplate = useDeleteMailingTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<MailingTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
  });
  const [activeTab, setActiveTab] = useState("html");
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textTextareaRef = useRef<HTMLTextAreaElement>(null);

  const textAssets = assets?.filter((a) => a.type === "text") || [];

  const insertTextBlock = (value: string) => {
    const ref = activeTab === "html" ? htmlTextareaRef : textTextareaRef;
    const field = activeTab === "html" ? "html_content" : "text_content";
    
    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const currentValue = formData[field];
      const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
      setFormData({ ...formData, [field]: newValue });
      
      // Restore cursor position after value
      setTimeout(() => {
        if (ref.current) {
          const newPos = start + value.length;
          ref.current.setSelectionRange(newPos, newPos);
          ref.current.focus();
        }
      }, 0);
    } else {
      // Fallback: append to end
      setFormData({ ...formData, [field]: formData[field] + value });
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setFormData({ name: "", subject: "", html_content: "", text_content: "" });
  };

  const handleEdit = (template: MailingTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || "",
    });
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (isCreating) {
      createTemplate.mutate(formData, {
        onSuccess: () => {
          setIsCreating(false);
          setFormData({ name: "", subject: "", html_content: "", text_content: "" });
        },
      });
    } else if (selectedTemplate) {
      updateTemplate.mutate(
        { id: selectedTemplate.id, data: formData },
        {
          onSuccess: () => {
            setSelectedTemplate(null);
          },
        }
      );
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

  // Show editor view
  if (isCreating || selectedTemplate) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isCreating ? "Nieuwe Template" : "Template bewerken"}
              </h1>
              <p className="text-muted-foreground">
                {isCreating ? "Maak een nieuwe e-mailtemplate" : `Bewerk "${selectedTemplate?.name}"`}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template gegevens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Naam</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="bijv. Nieuwsbrief januari"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Onderwerp</Label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="bijv. Nieuws van Mijn Aarde"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inhoud</CardTitle>
                  <CardDescription>
                    Gebruik HTML voor opgemaakte e-mails of platte tekst voor eenvoudige berichten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                      <TabsList>
                        <TabsTrigger value="html" className="gap-2">
                          <FileCode className="h-4 w-4" />
                          HTML
                        </TabsTrigger>
                        <TabsTrigger value="text" className="gap-2">
                          Tekst
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {(activeTab === "html" || activeTab === "text") && textAssets.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="ml-2">
                            <FileText className="h-4 w-4 mr-2" />
                            Tekstblok invoegen
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Tekstblokken</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {textAssets.map((asset) => (
                            <DropdownMenuItem
                              key={asset.id}
                              onClick={() => insertTextBlock(asset.value)}
                              className="flex flex-col items-start"
                            >
                              <span className="font-medium">{asset.label}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-full">
                                {asset.value.substring(0, 50)}...
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsContent value="html" className="mt-0 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        HTML-versie voor e-mailclients die HTML ondersteunen
                      </p>
                      <Textarea
                        ref={htmlTextareaRef}
                        value={formData.html_content}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        placeholder="<html>...</html>"
                        className="font-mono text-sm min-h-[400px]"
                      />
                    </TabsContent>
                    <TabsContent value="text" className="mt-0 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Platte tekst versie als fallback of voor eenvoudige e-mails
                      </p>
                      <Textarea
                        ref={textTextareaRef}
                        value={formData.text_content}
                        onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                        placeholder="Beste {{voornaam}},&#10;&#10;Hier komt je bericht...&#10;&#10;Met vriendelijke groet,&#10;Mijn Aarde"
                        className="min-h-[400px]"
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0">
                      <Tabs defaultValue="preview-html">
                        <TabsList className="mb-4">
                          <TabsTrigger value="preview-html" disabled={!formData.html_content}>
                            HTML Preview
                          </TabsTrigger>
                          <TabsTrigger value="preview-text" disabled={!formData.text_content}>
                            Tekst Preview
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview-html">
                          <div className="border rounded-lg p-4 min-h-[400px] bg-white">
                            {formData.html_content ? (
                              <div dangerouslySetInnerHTML={{ __html: formData.html_content }} />
                            ) : (
                              <p className="text-muted-foreground text-center py-8">
                                Voer HTML in om een preview te zien
                              </p>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="preview-text">
                          <div className="border rounded-lg p-4 min-h-[400px] bg-white">
                            {formData.text_content ? (
                              <pre className="whitespace-pre-wrap font-sans text-sm">
                                {formData.text_content}
                              </pre>
                            ) : (
                              <p className="text-muted-foreground text-center py-8">
                                Voer tekst in om een preview te zien
                              </p>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.name || !formData.subject || (!formData.html_content && !formData.text_content)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? "Aanmaken" : "Opslaan"}
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Annuleren
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Beschikbare placeholders</CardTitle>
                <CardDescription>Gebruik deze variabelen in je template</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {placeholderHelp.map((item) => (
                    <div key={item.placeholder} className="flex flex-col gap-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                        {item.placeholder}
                      </code>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show list view
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">Beheer e-mailsjablonen voor mailings</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe template
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {templates?.length === 0 ? (
              <div className="text-center py-12">
                <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen templates</h3>
                <p className="text-muted-foreground mb-4">
                  Maak je eerste e-mailtemplate om mailings te kunnen versturen.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe template
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Onderwerp</TableHead>
                    <TableHead>Laatst gewijzigd</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.map((template) => (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer"
                      onClick={() => handleEdit(template)}
                    >
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        {format(new Date(template.updated_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dit kan niet ongedaan worden gemaakt. Mailings die deze template gebruiken zullen leeg zijn.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTemplate.mutate(template.id)}>
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
