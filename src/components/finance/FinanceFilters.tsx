import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, X, Search, Download } from "lucide-react";

export type PeriodFilterType = "all" | "year" | "quarter" | "month" | "custom";

export interface FinanceFiltersState {
  periodType: PeriodFilterType;
  year: number;
  quarter: string;
  month: string;
  customStart: string;
  customEnd: string;
  search: string;
  type: string;
}

interface FinanceFiltersProps {
  filters: FinanceFiltersState;
  onFiltersChange: (filters: FinanceFiltersState) => void;
  onExport: () => void;
  typeOptions: { value: string; label: string }[];
  typeLabel?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

const months = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maart" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Augustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const quarters = [
  { value: "Q1", label: "Q1 (jan-mrt)" },
  { value: "Q2", label: "Q2 (apr-jun)" },
  { value: "Q3", label: "Q3 (jul-sep)" },
  { value: "Q4", label: "Q4 (okt-dec)" },
];

export function FinanceFilters({
  filters,
  onFiltersChange,
  onExport,
  typeOptions,
  typeLabel = "Type",
}: FinanceFiltersProps) {
  const updateFilter = <K extends keyof FinanceFiltersState>(
    key: K,
    value: FinanceFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      periodType: "all",
      year: currentYear,
      quarter: "Q1",
      month: "01",
      customStart: "",
      customEnd: "",
      search: "",
      type: "all",
    });
  };

  const hasActiveFilters =
    filters.periodType !== "all" ||
    filters.search !== "" ||
    filters.type !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {/* Search */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Zoeken</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Omschrijving..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-[180px] pl-9"
          />
        </div>
      </div>

      {/* Type filter */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{typeLabel}</Label>
        <Select
          value={filters.type}
          onValueChange={(v) => updateFilter("type", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period filter */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Periode</Label>
        <Select
          value={filters.periodType}
          onValueChange={(v) => updateFilter("periodType", v as PeriodFilterType)}
        >
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle data</SelectItem>
            <SelectItem value="year">Per jaar</SelectItem>
            <SelectItem value="quarter">Per kwartaal</SelectItem>
            <SelectItem value="month">Per maand</SelectItem>
            <SelectItem value="custom">Aangepast</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Year selector (shown for year, quarter, month) */}
      {(filters.periodType === "year" ||
        filters.periodType === "quarter" ||
        filters.periodType === "month") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Jaar</Label>
          <Select
            value={filters.year.toString()}
            onValueChange={(v) => updateFilter("year", parseInt(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quarter selector */}
      {filters.periodType === "quarter" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kwartaal</Label>
          <Select
            value={filters.quarter}
            onValueChange={(v) => updateFilter("quarter", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quarters.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Month selector */}
      {filters.periodType === "month" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Maand</Label>
          <Select
            value={filters.month}
            onValueChange={(v) => updateFilter("month", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom date range */}
      {filters.periodType === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Van</Label>
            <Input
              type="date"
              value={filters.customStart}
              onChange={(e) => updateFilter("customStart", e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tot</Label>
            <Input
              type="date"
              value={filters.customEnd}
              onChange={(e) => updateFilter("customEnd", e.target.value)}
              className="w-[150px]"
            />
          </div>
        </>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10">
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Export button */}
      <div className="ml-auto">
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exporteren
        </Button>
      </div>
    </div>
  );
}

export function getDefaultFilters(): FinanceFiltersState {
  return {
    periodType: "all",
    year: currentYear,
    quarter: "Q1",
    month: "01",
    customStart: "",
    customEnd: "",
    search: "",
    type: "all",
  };
}

export function filterByPeriod<T extends { date: string }>(
  items: T[],
  filters: FinanceFiltersState
): T[] {
  let filtered = items;

  // Text search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((item) =>
      (item as any).description?.toLowerCase().includes(searchLower)
    );
  }

  // Type filter
  if (filters.type !== "all") {
    filtered = filtered.filter((item) => (item as any).type === filters.type);
  }

  // Period filter
  if (filters.periodType === "all") {
    return filtered;
  }

  return filtered.filter((item) => {
    const itemDate = new Date(item.date);
    const itemYear = itemDate.getFullYear();
    const itemMonth = itemDate.getMonth() + 1;

    switch (filters.periodType) {
      case "year":
        return itemYear === filters.year;
      case "quarter": {
        if (itemYear !== filters.year) return false;
        const quarterMap: Record<string, number[]> = {
          Q1: [1, 2, 3],
          Q2: [4, 5, 6],
          Q3: [7, 8, 9],
          Q4: [10, 11, 12],
        };
        return quarterMap[filters.quarter]?.includes(itemMonth);
      }
      case "month": {
        return (
          itemYear === filters.year &&
          itemMonth === parseInt(filters.month)
        );
      }
      case "custom": {
        if (filters.customStart && itemDate < new Date(filters.customStart)) {
          return false;
        }
        if (filters.customEnd && itemDate > new Date(filters.customEnd)) {
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  });
}

export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; header: string; format?: (val: any, row: T) => string }[],
  filename: string
) {
  const headers = columns.map((c) => c.header).join(";");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        if (col.format) {
          return `"${col.format(val, row).replace(/"/g, '""')}"`;
        }
        if (val === null || val === undefined) return "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(";")
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}
