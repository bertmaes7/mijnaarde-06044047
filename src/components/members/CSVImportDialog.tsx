import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseCSV, ParsedMember, generateTemplateCSV, downloadCSV } from "@/lib/csv";
import { useCompanies, useCreateCompany } from "@/hooks/useCompanies";
import { useCreateMember } from "@/hooks/useMembers";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedMember[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [] } = useCompanies();
  const createCompany = useCreateCompany();

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setParseErrors([]);
    setImportResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const result = parseCSV(text, companies);
      setParsedData(result.members);
      setParseErrors(result.errors);
    } catch (error) {
      setParseErrors(["Fout bij het lezen van het bestand"]);
      setParsedData(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateTemplateCSV();
    downloadCSV(template, "leden_template.csv");
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    // Create a map of existing companies
    const companyMap = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));
    const newCompanies = new Map<string, string>();

    try {
      for (const member of parsedData) {
        try {
          let companyId: string | null = null;

          // Handle company lookup/creation
          if (member.company_name) {
            const lowerName = member.company_name.toLowerCase();
            
            if (companyMap.has(lowerName)) {
              companyId = companyMap.get(lowerName)!;
            } else if (newCompanies.has(lowerName)) {
              companyId = newCompanies.get(lowerName)!;
            } else {
              // Create new company
              const { data: newCompany, error } = await supabase
                .from("companies")
                .insert({ name: member.company_name })
                .select()
                .single();

              if (!error && newCompany) {
                companyId = newCompany.id;
                newCompanies.set(lowerName, newCompany.id);
              }
            }
          }

          // Insert member
          const { error } = await supabase.from("members").insert({
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email || null,
            phone: member.phone || null,
            mobile: member.mobile || null,
            address: member.address || null,
            postal_code: member.postal_code || null,
            city: member.city || null,
            country: member.country || "België",
            personal_url: member.personal_url || null,
            company_id: companyId,
            is_active: member.is_active,
            notes: member.notes || null,
          });

          if (error) {
            failed++;
          } else {
            success++;
          }
        } catch {
          failed++;
        }
      }

      setImportResult({ success, failed });

      if (success > 0) {
        toast.success(`${success} leden geïmporteerd`);
      }
      if (failed > 0) {
        toast.error(`${failed} leden konden niet worden geïmporteerd`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            CSV Importeren
          </DialogTitle>
          <DialogDescription>
            Upload een CSV-bestand om leden in bulk toe te voegen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Download eerst de template
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>

          {/* File upload */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
              disabled={isImporting}
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : "Selecteer CSV-bestand"}
            </Button>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ScrollArea className="max-h-32">
                  <ul className="list-disc pl-4 space-y-1">
                    {parseErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData && parsedData.length > 0 && !importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>{parsedData.length} leden</strong> gevonden in het
                bestand en klaar om te importeren.
              </AlertDescription>
            </Alert>
          )}

          {/* Import result */}
          {importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                Import voltooid: <strong>{importResult.success}</strong> succesvol
                {importResult.failed > 0 && (
                  <>, <strong>{importResult.failed}</strong> mislukt</>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "Sluiten" : "Annuleren"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!parsedData || parsedData.length === 0 || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importeren...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importeren
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
