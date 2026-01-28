import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Save, FileCode, Eye, ArrowLeft, FileText, Loader2, Copy, Code } from "lucide-react";
import {
  useMailingTemplates,
  useCreateMailingTemplate,
  useUpdateMailingTemplate,
  useDeleteMailingTemplate,
  useMailingAssets,
  useCreateMailingAsset,
  useUpdateMailingAsset,
  useDeleteMailingAsset,
  MailingTemplate,
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
import { RichTextEditor } from "@/components/mailing/RichTextEditor";
import { toast } from "sonner";

const placeholderHelp = [
  { placeholder: "{{voornaam}}", description: "Voornaam van het lid" },
  { placeholder: "{{achternaam}}", description: "Achternaam van het lid" },
  { placeholder: "{{naam}}", description: "Volledige naam" },
  { placeholder: "{{email}}", description: "E-mailadres" },
  { placeholder: "{{org_name}}", description: "Organisatienaam" },
  { placeholder: "{{logo_url}}", description: "Logo URL" },
  { placeholder: "{{logo}}", description: "Logo als afbeelding" },
];

export default function MailingTemplates() {
  const { data: templates, isLoading } = useMailingTemplates();
  const { data: assets, isLoading: assetsLoading } = useMailingAssets();
  const createTemplate = useCreateMailingTemplate();
  const updateTemplate = useUpdateMailingTemplate();
  const deleteTemplate = useDeleteMailingTemplate();
  const createAsset = useCreateMailingAsset();
  const updateAsset = useUpdateMailingAsset();
  const deleteAsset = useDeleteMailingAsset();

  const [selectedTemplate, setSelectedTemplate] = useState<MailingTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
  });
  const [activeTab, setActiveTab] = useState("visual");
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Text blocks state
  const [editedTextBlocks, setEditedTextBlocks] = useState<Record<string, string>>({});
  const [newTextBlock, setNewTextBlock] = useState({ key: "", label: "", value: "" });
  const [isTextBlockDialogOpen, setIsTextBlockDialogOpen] = useState(false);

  const textAssets = assets?.filter((a) => a.type === "text") || [];

  const handleTextBlockValueChange = (id: string, value: string) => {
    setEditedTextBlocks((prev) => ({ ...prev, [id]: value }));
  };

  const handleTextBlockSave = (id: string) => {
    if (editedTextBlocks[id] !== undefined) {
      updateAsset.mutate({ id, value: editedTextBlocks[id] });
      setEditedTextBlocks((prev) => {
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
    setIsTextBlockDialogOpen(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    if (editorMode === "html") {
      const ref = htmlTextareaRef;
      if (ref.current) {
        const start = ref.current.selectionStart;
        const end = ref.current.selectionEnd;
        const currentValue = formData.html_content;
        const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
        setFormData({ ...formData, html_content: newValue });
        
        setTimeout(() => {
          if (ref.current) {
            const newPos = start + placeholder.length;
            ref.current.setSelectionRange(newPos, newPos);
            ref.current.focus();
          }
        }, 0);
      } else {
        setFormData({ ...formData, html_content: formData.html_content + placeholder });
      }
    } else {
      // For visual editor, append at the end
      setFormData({ ...formData, html_content: formData.html_content + placeholder });
    }
    toast.success(`${placeholder} toegevoegd`);
  };

  const insertTextBlock = (value: string) => {
    if (editorMode === "html") {
      const ref = htmlTextareaRef;
      if (ref.current) {
        const start = ref.current.selectionStart;
        const end = ref.current.selectionEnd;
        const currentValue = formData.html_content;
        const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
        setFormData({ ...formData, html_content: newValue });
        
        setTimeout(() => {
          if (ref.current) {
            const newPos = start + value.length;
            ref.current.setSelectionRange(newPos, newPos);
            ref.current.focus();
          }
        }, 0);
      } else {
        setFormData({ ...formData, html_content: formData.html_content + value });
      }
    } else {
      setFormData({ ...formData, html_content: formData.html_content + value });
    }
    toast.success("Tekstblok ingevoegd");
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setFormData({ name: "", subject: "", html_content: "", text_content: "" });
    setEditorMode("visual");
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
    setEditorMode("visual");
  };

  const handleDuplicate = (template: MailingTemplate) => {
    createTemplate.mutate({
      name: `${template.name} (kopie)`,
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

          <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inhoud</CardTitle>
                    <CardDescription>
                      Plak tekst met afbeeldingen uit Word of gebruik de visuele editor
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Toolbar with placeholders and text blocks */}
                <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Invoegen:</span>
                  
                  {/* Placeholder buttons */}
                  {placeholderHelp.map((item) => (
                    <Button
                      key={item.placeholder}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder(item.placeholder)}
                      title={item.description}
                      className="h-7 text-xs"
                    >
                      {item.placeholder.replace(/[{}]/g, '')}
                    </Button>
                  ))}
                  
                  {/* Text blocks dropdown */}
                  {textAssets.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Tekstblok
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
                  
                  <div className="flex-1" />
                  
                  {/* Editor mode toggle */}
                  <Button
                    type="button"
                    variant={editorMode === "html" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode(editorMode === "visual" ? "html" : "visual")}
                    className="h-7 text-xs"
                  >
                    <Code className="h-3 w-3 mr-1" />
                    {editorMode === "visual" ? "HTML bekijken" : "Visueel bewerken"}
                  </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="visual" className="gap-2">
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
                  
                  <TabsContent value="visual" className="mt-4 space-y-2">
                    {editorMode === "visual" ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">
                          Plak tekst met afbeeldingen uit Word, of gebruik de knoppen om op te maken
                        </p>
                        <RichTextEditor
                          content={formData.html_content}
                          onChange={(html) => setFormData({ ...formData, html_content: html })}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Bewerk de HTML-code rechtstreeks
                        </p>
                        <Textarea
                          ref={htmlTextareaRef}
                          value={formData.html_content}
                          onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                          placeholder="<html>...</html>"
                          className="font-mono text-sm min-h-[400px]"
                        />
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-4 space-y-2">
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
                  
                  <TabsContent value="preview" className="mt-4">
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
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(formData.html_content, {
                                  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'span', 'div', 
                                    'a', 'img', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                                    'strong', 'b', 'em', 'i', 'u', 'blockquote', 'pre', 'code', 'center'],
                                  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'width', 'height', 
                                    'border', 'cellpadding', 'cellspacing', 'align', 'valign', 'bgcolor', 'color'],
                                  ALLOW_DATA_ATTR: false,
                                })
                              }} 
                            />
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
            <p className="text-muted-foreground">Beheer e-mailsjablonen en herbruikbare tekstblokken</p>
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
                    <TableHead className="w-[120px]">Acties</TableHead>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(template)}
                            title="Dupliceer template"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
            <Dialog open={isTextBlockDialogOpen} onOpenChange={setIsTextBlockDialogOpen}>
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
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : textAssets.length === 0 ? (
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
                      value={editedTextBlocks[asset.id] ?? asset.value}
                      onChange={(e) => handleTextBlockValueChange(asset.id, e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleTextBlockSave(asset.id)}
                      disabled={editedTextBlocks[asset.id] === undefined || updateAsset.isPending}
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
