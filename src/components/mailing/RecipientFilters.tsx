import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X, Filter, Tag, ChevronDown } from "lucide-react";

export interface RecipientFiltersState {
  status: "all" | "active" | "inactive";
  companyId: string;
  city: string;
  membershipType: string;
  tagIds: string[];
}

interface Company {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface RecipientFiltersProps {
  filters: RecipientFiltersState;
  onFiltersChange: (filters: RecipientFiltersState) => void;
  companies: Company[];
  cities: string[];
  tags?: TagOption[];
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
  tags = [],
}: RecipientFiltersProps) {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState("");

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
        <span className="text-sm font-medium">Filter ontvangers</span>
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

        {/* Tag Filter */}
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Tag className="h-3.5 w-3.5" />
              Tags
              {filters.tagIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {filters.tagIds.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Zoek tag..."
                value={tagInputValue}
                onValueChange={setTagInputValue}
              />
              <CommandList>
                <CommandEmpty>Geen tags gevonden</CommandEmpty>
                <CommandGroup>
                  {tags
                    .filter(t => !filters.tagIds.includes(t.id))
                    .filter(t => t.name.toLowerCase().includes(tagInputValue.toLowerCase()))
                    .map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => {
                          onFiltersChange({
                            ...filters,
                            tagIds: [...filters.tagIds, tag.id],
                          });
                          setTagPopoverOpen(false);
                          setTagInputValue("");
                        }}
                      >
                        <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                        {tag.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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

      {/* Show active tag badges */}
      {filters.tagIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.tagIds.map((tagId) => {
            const tag = tags.find(t => t.id === tagId);
            return tag ? (
              <Badge key={tagId} variant="secondary" className="gap-1 pr-1">
                <Tag className="h-3 w-3" />
                {tag.name}
                <button
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      tagIds: filters.tagIds.filter(id => id !== tagId),
                    })
                  }
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
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
  member_tags?: { tag_id: string }[];
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

    // Tag filter - member must have ALL selected tags
    if (filters.tagIds.length > 0) {
      const memberTagIds = member.member_tags?.map(mt => mt.tag_id) || [];
      if (!filters.tagIds.every(tagId => memberTagIds.includes(tagId))) return false;
    }

    return true;
  });
}
