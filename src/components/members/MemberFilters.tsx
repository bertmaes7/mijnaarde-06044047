import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Company } from "@/lib/supabase";
import { X, Filter } from "lucide-react";
import { TagFilter } from "./TagFilter";

export interface MemberFiltersState {
  status: "all" | "active" | "inactive";
  companyId: string;
  city: string;
  membershipType: string;
  tagIds: string[];
}

interface MemberFiltersProps {
  filters: MemberFiltersState;
  onFiltersChange: (filters: MemberFiltersState) => void;
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

export function MemberFilters({
  filters,
  onFiltersChange,
  companies,
  cities,
}: MemberFiltersProps) {
  const activeFiltersCount = [
    filters.status !== "all",
    filters.companyId !== "all",
    filters.city !== "all",
    filters.membershipType !== "all",
    filters.tagIds.length > 0,
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      status: "all",
      companyId: "all",
      city: "all",
      membershipType: "all",
      tagIds: [],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount} actief
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
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

        <TagFilter
          selectedTagIds={filters.tagIds}
          onTagsChange={(tagIds) => onFiltersChange({ ...filters, tagIds })}
        />

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
