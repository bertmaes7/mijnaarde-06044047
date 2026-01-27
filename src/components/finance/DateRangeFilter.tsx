import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, X } from "lucide-react";

export type DateFilterType = "all" | "quarter" | "custom";

export type QuarterOption = "Q1" | "Q2" | "Q3" | "Q4";

interface DateRangeFilterProps {
  filterType: DateFilterType;
  setFilterType: (type: DateFilterType) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedQuarter: QuarterOption;
  setSelectedQuarter: (quarter: QuarterOption) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  onClear: () => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function DateRangeFilter({
  filterType,
  setFilterType,
  selectedYear,
  setSelectedYear,
  selectedQuarter,
  setSelectedQuarter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onClear,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Filter</Label>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as DateFilterType)}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle data</SelectItem>
            <SelectItem value="quarter">Per kwartaal</SelectItem>
            <SelectItem value="custom">Aangepast</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filterType === "quarter" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Jaar</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Kwartaal</Label>
            <Select value={selectedQuarter} onValueChange={(v) => setSelectedQuarter(v as QuarterOption)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1 (jan-mrt)</SelectItem>
                <SelectItem value="Q2">Q2 (apr-jun)</SelectItem>
                <SelectItem value="Q3">Q3 (jul-sep)</SelectItem>
                <SelectItem value="Q4">Q4 (okt-dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {filterType === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Van</Label>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tot</Label>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </>
      )}

      {filterType !== "all" && (
        <Button variant="ghost" size="icon" onClick={onClear} className="h-10 w-10">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function getQuarterDates(year: number, quarter: QuarterOption): { start: Date; end: Date } {
  const quarters = {
    Q1: { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
    Q2: { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
    Q3: { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
    Q4: { start: new Date(year, 9, 1), end: new Date(year, 11, 31) },
  };
  return quarters[quarter];
}
