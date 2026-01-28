import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

export interface RecipientFiltersState {
  status: "all" | "active" | "inactive";
  companyId: string;
  city: string;
  membershipType: string;
}

interface Company {
  id: string;
  name: string;
}

interface RecipientFiltersProps {
  filters: RecipientFiltersState;
  onFiltersChange: (filters: RecipientFiltersState) => void;
  companies: Company[];
  cities: string[];
}

const MEMBERSHIP_TYPES = [
  { value: "all", label: "Alle types" },
  { value: "board", label: "Bestuur" },
  { value: "active", label: "Actief lid" },
  { value: "ambassador", label: "Ambassadeur" },
  { value: "donor", label: "Donateur" },
  { value: "council", label: "Raad van wijzen" },
  { value: "mail", label: "Ontvangt mail" },
];

export function RecipientFilters({
  filters,
  onFiltersChange,
  companies,
  cities,
}: RecipientFiltersProps) {
  const activeFiltersCount = [
    filters.status !== "all",
    filters.companyId !== "all",
    filters.city !== "all",
    filters.membershipType !== "all",
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      status: "all",
      companyId: "all",
      city: "all",
      membershipType: "all",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter ontvangers</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount} actief
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onValueChange={(value: "all" | "active" | "inactive") =>
            onFiltersChange({ ...filters, status: value })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
            <SelectItem value="inactive">Inactief</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.companyId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, companyId: value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Bedrijf" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle bedrijven</SelectItem>
            <SelectItem value="none">Geen bedrijf</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.city}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, city: value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle steden</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.membershipType}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, membershipType: value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Lidmaatschap" />
          </SelectTrigger>
          <SelectContent>
            {MEMBERSHIP_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export function applyRecipientFilters<T extends {
  is_active: boolean | null;
  company_id: string | null;
  city: string | null;
  is_board_member: boolean | null;
  is_active_member: boolean | null;
  is_ambassador: boolean | null;
  is_donor: boolean | null;
  is_council_member: boolean | null;
  receives_mail: boolean | null;
}>(members: T[], filters: RecipientFiltersState): T[] {
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
}
