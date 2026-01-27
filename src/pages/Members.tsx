import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MembersTable } from "@/components/members/MembersTable";
import { MemberFilters, MemberFiltersState } from "@/components/members/MemberFilters";
import { CSVImportDialog } from "@/components/members/CSVImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { exportMembersToCSV, downloadCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Search, Plus, Upload, Download } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [filters, setFilters] = useState<MemberFiltersState>({
    status: "all",
    companyId: "all",
    city: "all",
    membershipType: "all",
  });
  
  const { data: members = [], isLoading, refetch } = useMembers(search);
  const { data: companies = [] } = useCompanies();

  // Extract unique cities from members
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    members.forEach((member) => {
      if (member.city) {
        citySet.add(member.city);
      }
    });
    return Array.from(citySet).sort();
  }, [members]);

  // Apply filters
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Status filter
      if (filters.status === "active" && !member.is_active) return false;
      if (filters.status === "inactive" && member.is_active) return false;

      // Company filter
      if (filters.companyId === "none" && member.company_id) return false;
      if (filters.companyId !== "all" && filters.companyId !== "none" && member.company_id !== filters.companyId) return false;

      // City filter
      if (filters.city !== "all" && member.city !== filters.city) return false;

      // Membership type filter
      if (filters.membershipType !== "all") {
        switch (filters.membershipType) {
          case "board":
            if (!member.is_board_member) return false;
            break;
          case "active":
            if (!member.is_active_member) return false;
            break;
          case "ambassador":
            if (!member.is_ambassador) return false;
            break;
          case "donor":
            if (!member.is_donor) return false;
            break;
          case "council":
            if (!member.is_council_member) return false;
            break;
          case "mail":
            if (!member.receives_mail) return false;
            break;
        }
      }

      return true;
    });
  }, [members, filters]);

  const handleExport = () => {
    if (filteredMembers.length === 0) {
      toast.error("Geen leden om te exporteren");
      return;
    }
    const csv = exportMembersToCSV(filteredMembers);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `leden_export_${date}.csv`);
    toast.success(`${filteredMembers.length} leden geëxporteerd`);
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
              {filteredMembers.length} van {members.length} leden
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
              disabled={filteredMembers.length === 0}
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

        {/* Filters */}
        <MemberFilters
          filters={filters}
          onFiltersChange={setFilters}
          companies={companies}
          cities={cities}
        />

        {/* Table */}
        <MembersTable members={filteredMembers} isLoading={isLoading} />

        {/* Import Dialog */}
        <CSVImportDialog
          open={importDialogOpen}
          onOpenChange={handleImportClose}
        />
      </div>
    </MainLayout>
  );
}
