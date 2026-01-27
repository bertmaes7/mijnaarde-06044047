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
import { ExternalLink, Mail, Phone, Pencil } from "lucide-react";

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
}

export function MembersTable({ members, isLoading }: MembersTableProps) {
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
            <TableHead className="w-[250px]">Naam</TableHead>
            <TableHead>Bedrijf</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
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
                <div className="flex flex-col gap-1">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {member.email}
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
