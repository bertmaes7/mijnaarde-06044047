import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryList } from "@/components/finance/InventoryList";

export default function Inventory() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventaris"
          description="Beheer de vermogensbestanddelen per boekjaar"
          actions={
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <InventoryList fiscalYear={selectedYear} />
      </div>
    </MainLayout>
  );
}
