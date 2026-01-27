import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "./MemberAvatar";
import { Member } from "@/lib/supabase";
import { ExternalLink, Mail, Phone, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
}

type SortField = "name" | "company" | "city" | "email" | "status" | "member_since";
type SortDirection = "asc" | "desc";

interface SortState {
  field: SortField;
  direction: SortDirection;
}

function SortableHeader({
  children,
  field,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  field: SortField;
  currentSort: SortState;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 font-medium hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      {children}
      {isActive ? (
        currentSort.direction === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

export function MembersTable({ members, isLoading }: MembersTableProps) {
  const [sort, setSort] = useState<SortState>({ field: "name", direction: "asc" });

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case "name":
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          );
          break;
        case "company":
          comparison = (a.company?.name || "").localeCompare(b.company?.name || "");
          break;
        case "city":
          comparison = (a.city || "").localeCompare(b.city || "");
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "status":
          comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
          break;
        case "member_since":
          comparison = (a.member_since || "").localeCompare(b.member_since || "");
          break;
      }
      
      return sort.direction === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [members, sort]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Geen leden gevonden</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[250px]">
              <SortableHeader field="name" currentSort={sort} onSort={handleSort}>
                Naam
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="company" currentSort={sort} onSort={handleSort}>
                Bedrijf
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="city" currentSort={sort} onSort={handleSort}>
                Stad
              </SortableHeader>
            </TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>
              <SortableHeader field="member_since" currentSort={sort} onSort={handleSort}>
                Lid sinds
              </SortableHeader>
            </TableHead>
            <TableHead>Lidmaatschap</TableHead>
            <TableHead>
              <SortableHeader field="status" currentSort={sort} onSort={handleSort}>
                Status
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[80px]">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((member) => (
            <TableRow key={member.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    firstName={member.first_name}
                    lastName={member.last_name}
                    photoUrl={member.profile_photo_url}
                    size="md"
                  />
                  <div>
                    <p className="font-medium">
                      {member.first_name} {member.last_name}
                    </p>
                    {member.personal_url && (
                      <a
                        href={member.personal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {member.company ? (
                  <span className="text-sm">{member.company.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {member.city ? (
                  <span className="text-sm">{member.city}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="max-w-[150px] truncate">{member.email}</span>
                    </a>
                  )}
                  {member.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {member.phone}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {member.member_since ? (
                  <span className="text-sm">
                    {new Date(member.member_since).toLocaleDateString("nl-BE")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.is_board_member && (
                    <Badge variant="outline" className="text-xs">Bestuur</Badge>
                  )}
                  {member.is_ambassador && (
                    <Badge variant="outline" className="text-xs">Ambassadeur</Badge>
                  )}
                  {member.is_donor && (
                    <Badge variant="outline" className="text-xs">Donateur</Badge>
                  )}
                  {member.is_council_member && (
                    <Badge variant="outline" className="text-xs">Raad</Badge>
                  )}
                  {!member.is_board_member && !member.is_ambassador && !member.is_donor && !member.is_council_member && member.is_active_member && (
                    <Badge variant="outline" className="text-xs">Lid</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={member.is_active ? "default" : "secondary"}>
                  {member.is_active ? "Actief" : "Inactief"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/members/${member.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
