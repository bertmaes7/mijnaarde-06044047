import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MembersTable } from "@/components/members/MembersTable";
import { CSVImportDialog } from "@/components/members/CSVImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembers } from "@/hooks/useMembers";
import { exportMembersToCSV, downloadCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Search, Plus, Upload, Download } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { data: members = [], isLoading, refetch } = useMembers(search);

  const handleExport = () => {
    if (members.length === 0) {
      toast.error("Geen leden om te exporteren");
      return;
    }
    const csv = exportMembersToCSV(members);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `leden_export_${date}.csv`);
    toast.success(`${members.length} leden geëxporteerd`);
  };

  const handleImportClose = (open: boolean) => {
    setImportDialogOpen(open);
    if (!open) {
      refetch();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Leden
            </h1>
            <p className="mt-1 text-muted-foreground">
              Beheer alle leden van de vzw
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importeren
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={members.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exporteren
            </Button>
            <Button asChild className="gap-2">
              <Link to="/members/new">
                <Plus className="h-4 w-4" />
                Nieuw lid
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <MembersTable members={members} isLoading={isLoading} />

        {/* Import Dialog */}
        <CSVImportDialog
          open={importDialogOpen}
          onOpenChange={handleImportClose}
        />
      </div>
    </MainLayout>
  );
}
