import { useMemo, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useIncome, useExpenses } from "@/hooks/useFinance";
import { useInventory, INVENTORY_TYPES } from "@/hooks/useInventory";
import { ArrowLeft, Printer, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const formatCurrency = (amount: number) => {
  return amount.toFixed(2).replace(".", ",");
};

const formatDateBelgian = (date: Date) => {
  return date.toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Organization info - could be fetched from settings
const ORGANIZATION = {
  name: "Mijn Aarde vzw",
  enterpriseNumber: "1030728334",
  address: "Hügerlaan 14",
  postalCode: "2280",
  city: "Grobbendonk",
};

// Map expense categories to official report categories
const expenseCategoryMapping: Record<string, string> = {
  kantoormateriaal: "goederen_diensten",
  professionele_diensten: "goederen_diensten",
  abonnementen: "goederen_diensten",
  huur: "diensten_diverse",
  nutsvoorzieningen: "diensten_diverse",
  verzekeringen: "diensten_diverse",
  reiskosten: "diensten_diverse",
  representatiekosten: "diensten_diverse",
  bankkosten: "andere_uitgaven",
  overig: "andere_uitgaven",
};

// Map income types to official report categories
const incomeTypeMapping: Record<string, string> = {
  membership: "lidgeld",
  donation: "schenkingen",
  other: "andere_ontvangsten",
};

export default function AnnualReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [approvalDate, setApprovalDate] = useState("");
  const [signatory1, setSignatory1] = useState("");
  const [signatory2, setSignatory2] = useState("");

  const [notes, setNotes] = useState({
    waarderingsregels: "",
    aanpassingWaardering: "",
    bijkomendeInfo: "",
    belangrijkeRechten: "",
  });

  const { data: income = [], isLoading: incomeLoading } = useIncome();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(selectedYear);

  // Filter by selected fiscal year (assume fiscal year = calendar year)
  const fiscalYearStart = new Date(selectedYear, 0, 1);
  const fiscalYearEnd = new Date(selectedYear, 11, 31);

  const filteredIncome = useMemo(() => {
    return income.filter((i) => {
      const date = new Date(i.date);
      return date >= fiscalYearStart && date <= fiscalYearEnd;
    });
  }, [income, selectedYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const date = new Date(e.date);
      return date >= fiscalYearStart && date <= fiscalYearEnd;
    });
  }, [expenses, selectedYear]);

  // Calculate totals by category
  const expenseTotals = useMemo(() => {
    const totals = {
      goederen_diensten: 0,
      bezoldigingen: 0,
      diensten_diverse: 0,
      andere_uitgaven: 0,
    };

    filteredExpenses.forEach((e) => {
      const category = (e as any).category || "overig";
      const mappedCategory = expenseCategoryMapping[category] || "andere_uitgaven";
      totals[mappedCategory as keyof typeof totals] += Number(e.amount);
    });

    return totals;
  }, [filteredExpenses]);

  const incomeTotals = useMemo(() => {
    const totals = {
      lidgeld: 0,
      schenkingen: 0,
      subsidies: 0,
      andere_ontvangsten: 0,
    };

    filteredIncome.forEach((i) => {
      const mappedCategory = incomeTypeMapping[i.type] || "andere_ontvangsten";
      totals[mappedCategory as keyof typeof totals] += Number(i.amount);
    });

    return totals;
  }, [filteredIncome]);

  const totalExpenses =
    expenseTotals.goederen_diensten +
    expenseTotals.bezoldigingen +
    expenseTotals.diensten_diverse +
    expenseTotals.andere_uitgaven;

  const totalIncome =
    incomeTotals.lidgeld +
    incomeTotals.schenkingen +
    incomeTotals.subsidies +
    incomeTotals.andere_ontvangsten;

  // Calculate inventory totals from database
  const inventoryTotals = useMemo(() => {
    const totals = {
      bezittingen: 0,
      schulden: 0,
      rechten: 0,
      verplichtingen: 0,
    };

    inventory.forEach((item) => {
      const category = item.category as keyof typeof totals;
      if (totals[category] !== undefined) {
        totals[category] += Number(item.amount);
      }
    });

    return totals;
  }, [inventory]);

  // Group inventory by type for detailed display
  const inventoryByType = useMemo(() => {
    const grouped: Record<string, { label: string; amount: number }> = {};

    inventory.forEach((item) => {
      if (!grouped[item.type]) {
        // Find the label from INVENTORY_TYPES
        const category = item.category as keyof typeof INVENTORY_TYPES;
        const typeInfo = INVENTORY_TYPES[category]?.find((t) => t.value === item.type);
        grouped[item.type] = {
          label: typeInfo?.label || item.type,
          amount: 0,
        };
      }
      grouped[item.type].amount += Number(item.amount);
    });

    return grouped;
  }, [inventory]);

  const handlePrint = () => {
    window.print();
  };

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const isLoading = incomeLoading || expensesLoading || inventoryLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header - Hide on print */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/finance">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Jaarrekening
              </h1>
              <p className="mt-1 text-muted-foreground">
                Officieel VZW-rapport voor boekjaar {selectedYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Afdrukken
            </Button>
          </div>
        </div>

        {/* Printable Report */}
        <div
          ref={printRef}
          className="bg-background print:bg-white print:text-black space-y-8"
        >
          {/* Report Header */}
          <Card className="card-elevated print:shadow-none print:border-0">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{ORGANIZATION.name}</h2>
                  <p className="text-muted-foreground print:text-gray-600">
                    Ond.nr. {ORGANIZATION.enterpriseNumber}
                  </p>
                  <p className="text-muted-foreground print:text-gray-600">
                    {ORGANIZATION.address}
                  </p>
                  <p className="text-muted-foreground print:text-gray-600">
                    {ORGANIZATION.postalCode} {ORGANIZATION.city}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-primary print:text-gray-700" />
              </div>
              <h1 className="text-3xl font-bold mt-6 text-center">
                JAARREKENING 1 jan {selectedYear} - 31 dec {selectedYear}
              </h1>
            </CardContent>
          </Card>

          {/* Bijlage B - Staat van ontvangsten en uitgaven */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">
                Bijlage B - Staat van ontvangsten en uitgaven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Uitgaven */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Uitgaven
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Goederen en diensten</td>
                        <td className="text-right py-2">
                          {formatCurrency(expenseTotals.goederen_diensten)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Bezoldigingen</td>
                        <td className="text-right py-2">
                          {formatCurrency(expenseTotals.bezoldigingen)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Diensten en diverse goederen</td>
                        <td className="text-right py-2">
                          {formatCurrency(expenseTotals.diensten_diverse)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Andere uitgaven</td>
                        <td className="text-right py-2">
                          {formatCurrency(expenseTotals.andere_uitgaven)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal uitgaven</td>
                        <td className="text-right py-2">
                          {formatCurrency(totalExpenses)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ontvangsten */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Ontvangsten
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Lidgeld</td>
                        <td className="text-right py-2">
                          {formatCurrency(incomeTotals.lidgeld)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Schenkingen en Legaten</td>
                        <td className="text-right py-2">
                          {formatCurrency(incomeTotals.schenkingen)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Subsidies</td>
                        <td className="text-right py-2">
                          {formatCurrency(incomeTotals.subsidies)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Andere ontvangsten</td>
                        <td className="text-right py-2">
                          {formatCurrency(incomeTotals.andere_ontvangsten)}
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal ontvangsten</td>
                        <td className="text-right py-2">
                          {formatCurrency(totalIncome)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bijlage C - Toelichting */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">
                Bijlage C - Toelichting bij de Jaarrekening
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="multiple" className="print:hidden">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    1. Samenvatting van de waarderingsregels
                  </AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      placeholder="Beschrijf de gehanteerde waarderingsregels..."
                      value={notes.waarderingsregels}
                      onChange={(e) =>
                        setNotes({ ...notes, waarderingsregels: e.target.value })
                      }
                      rows={4}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    2. Aanpassing van de waarderingsregels
                  </AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      placeholder="Beschrijf eventuele aanpassingen..."
                      value={notes.aanpassingWaardering}
                      onChange={(e) =>
                        setNotes({ ...notes, aanpassingWaardering: e.target.value })
                      }
                      rows={4}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>3. Bijkomende inlichtingen</AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      placeholder="Voeg bijkomende informatie toe..."
                      value={notes.bijkomendeInfo}
                      onChange={(e) =>
                        setNotes({ ...notes, bijkomendeInfo: e.target.value })
                      }
                      rows={4}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Print version of notes */}
              <div className="hidden print:block space-y-2">
                <div className="border p-2">
                  <p className="font-medium">1. Samenvatting van de waarderingsregels</p>
                  <p className="text-sm mt-1">{notes.waarderingsregels || "-"}</p>
                </div>
                <div className="border p-2">
                  <p className="font-medium">2. Aanpassing van de waarderingsregels</p>
                  <p className="text-sm mt-1">{notes.aanpassingWaardering || "-"}</p>
                </div>
                <div className="border p-2">
                  <p className="font-medium">3. Bijkomende inlichtingen</p>
                  <p className="text-sm mt-1">{notes.bijkomendeInfo || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Staat van het vermogen */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">4. Staat van het vermogen</CardTitle>
              <Button asChild variant="outline" size="sm" className="gap-2 print:hidden">
                <Link to="/finance/inventory">
                  <ExternalLink className="h-4 w-4" />
                  Inventaris beheren
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Geen inventarisitems gevonden voor {selectedYear}.{" "}
                  <Link to="/finance/inventory" className="text-primary hover:underline">
                    Voeg items toe
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-8">
                  {/* Bezittingen & Rechten */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold border-b-2 border-foreground print:border-black pb-1 mb-2">
                        Bezittingen
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {inventory
                            .filter((item) => item.category === "bezittingen")
                            .map((item) => {
                              const typeInfo = INVENTORY_TYPES.bezittingen.find(
                                (t) => t.value === item.type
                              );
                              return (
                                <tr key={item.id} className="border-b">
                                  <td className="py-1 text-xs">{typeInfo?.label || item.type}</td>
                                  <td className="text-right py-1 font-mono">
                                    € {formatCurrency(Number(item.amount))}
                                  </td>
                                </tr>
                              );
                            })}
                          <tr className="font-bold border-t-2 border-foreground print:border-black">
                            <td className="py-1">Totaal Bezittingen</td>
                            <td className="text-right py-1 font-mono">
                              € {formatCurrency(inventoryTotals.bezittingen)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="font-semibold border-b-2 border-foreground print:border-black pb-1 mb-2">
                        Rechten
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {inventory
                            .filter((item) => item.category === "rechten")
                            .map((item) => {
                              const typeInfo = INVENTORY_TYPES.rechten.find(
                                (t) => t.value === item.type
                              );
                              return (
                                <tr key={item.id} className="border-b">
                                  <td className="py-1 text-xs">{typeInfo?.label || item.type}</td>
                                  <td className="text-right py-1 font-mono">
                                    € {formatCurrency(Number(item.amount))}
                                  </td>
                                </tr>
                              );
                            })}
                          <tr className="font-bold border-t-2 border-foreground print:border-black">
                            <td className="py-1">Totaal Rechten</td>
                            <td className="text-right py-1 font-mono">
                              € {formatCurrency(inventoryTotals.rechten)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Schulden & Verplichtingen */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold border-b-2 border-foreground print:border-black pb-1 mb-2">
                        Schulden
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {inventory
                            .filter((item) => item.category === "schulden")
                            .map((item) => {
                              const typeInfo = INVENTORY_TYPES.schulden.find(
                                (t) => t.value === item.type
                              );
                              return (
                                <tr key={item.id} className="border-b">
                                  <td className="py-1 text-xs">{typeInfo?.label || item.type}</td>
                                  <td className="text-right py-1 font-mono">
                                    € {formatCurrency(Number(item.amount))}
                                  </td>
                                </tr>
                              );
                            })}
                          <tr className="font-bold border-t-2 border-foreground print:border-black">
                            <td className="py-1">Totaal Schulden</td>
                            <td className="text-right py-1 font-mono">
                              € {formatCurrency(inventoryTotals.schulden)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="font-semibold border-b-2 border-foreground print:border-black pb-1 mb-2">
                        Verplichtingen
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {inventory
                            .filter((item) => item.category === "verplichtingen")
                            .map((item) => {
                              const typeInfo = INVENTORY_TYPES.verplichtingen.find(
                                (t) => t.value === item.type
                              );
                              return (
                                <tr key={item.id} className="border-b">
                                  <td className="py-1 text-xs">{typeInfo?.label || item.type}</td>
                                  <td className="text-right py-1 font-mono">
                                    € {formatCurrency(Number(item.amount))}
                                  </td>
                                </tr>
                              );
                            })}
                          <tr className="font-bold border-t-2 border-foreground print:border-black">
                            <td className="py-1">Totaal Verplichtingen</td>
                            <td className="text-right py-1 font-mono">
                              € {formatCurrency(inventoryTotals.verplichtingen)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Belangrijke rechten en verplichtingen */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">
                5. Belangrijke rechten en verplichtingen die niet in cijfers kunnen worden
                weergegeven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Beschrijf belangrijke rechten en verplichtingen..."
                value={notes.belangrijkeRechten}
                onChange={(e) =>
                  setNotes({ ...notes, belangrijkeRechten: e.target.value })
                }
                rows={4}
                className="print:border-0 print:bg-transparent"
              />
            </CardContent>
          </Card>


          {/* Approval and Signatures */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Label className="whitespace-nowrap">
                  Goedgekeurd op de Algemene Vergadering van:
                </Label>
                <Input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="w-48 print:border-0 print:bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Getekend:</p>
                  <Input
                    placeholder="Naam bestuurder 1"
                    value={signatory1}
                    onChange={(e) => setSignatory1(e.target.value)}
                    className="border-0 border-b rounded-none print:border-0 print:bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground invisible">Getekend:</p>
                  <Input
                    placeholder="Naam bestuurder 2"
                    value={signatory2}
                    onChange={(e) => setSignatory2(e.target.value)}
                    className="border-0 border-b rounded-none print:border-0 print:bg-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .hidden.print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
