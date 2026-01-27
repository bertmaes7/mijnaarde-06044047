import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MembersTable } from "@/components/members/MembersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembers } from "@/hooks/useMembers";
import { Search, Plus } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");
  const { data: members = [], isLoading } = useMembers(search);

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
          <Button asChild className="gap-2">
            <Link to="/members/new">
              <Plus className="h-4 w-4" />
              Nieuw lid
            </Link>
          </Button>
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
      </div>
    </MainLayout>
  );
}
