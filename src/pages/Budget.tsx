import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Printer, FileDown } from "lucide-react";
import { useInventory, INVENTORY_TYPES } from "@/hooks/useInventory";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const formatCurrency = (amount: number) => {
  return amount.toFixed(2).replace(".", ",");
};

// Organization info - could be fetched from settings
const ORGANIZATION = {
  name: "Mijn Aarde vzw",
  enterpriseNumber: "1030728334",
  address: "Hügerlaan 14",
  postalCode: "2280",
  city: "Grobbendonk",
};

export default function Budget() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [approvalDate, setApprovalDate] = useState("");
  const [signatory, setSignatory] = useState("");

  // Get the fiscal year for inventory (use start year)
  const fiscalYear = new Date(startDate).getFullYear();
  const { data: inventory = [], isLoading } = useInventory(fiscalYear);

  // Budget amounts for income and expenses (can be manually adjusted)
  const [budgetExpenses, setBudgetExpenses] = useState({
    goederen_diensten: 0,
    bezoldigingen: 0,
    diensten_diverse: 0,
    andere_uitgaven: 0,
  });

  const [budgetIncome, setBudgetIncome] = useState({
    lidgeld: 0,
    schenkingen: 0,
    subsidies: 0,
    andere_ontvangsten: 0,
  });

  const totalExpenses = useMemo(() => {
    return Object.values(budgetExpenses).reduce((sum, v) => sum + v, 0);
  }, [budgetExpenses]);

  const totalIncome = useMemo(() => {
    return Object.values(budgetIncome).reduce((sum, v) => sum + v, 0);
  }, [budgetIncome]);

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

  // Group inventory items by type for display
  const inventoryByType = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {
      bezittingen: {},
      schulden: {},
      rechten: {},
      verplichtingen: {},
    };

    inventory.forEach((item) => {
      if (!grouped[item.category][item.type]) {
        grouped[item.category][item.type] = 0;
      }
      grouped[item.category][item.type] += Number(item.amount);
    });

    return grouped;
  }, [inventory]);

  const formatPeriod = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("nl-BE")} - ${end.toLocaleDateString("nl-BE")}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const element = document.getElementById("budget-content");
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`begroting-${fiscalYear}.pdf`);
  };

  const getTypeLabel = (category: keyof typeof INVENTORY_TYPES, typeValue: string) => {
    const types = INVENTORY_TYPES[category];
    const found = types.find((t) => t.value === typeValue);
    return found?.label || typeValue;
  };

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
          <PageHeader
            title="Begroting"
            description="Opstellen van de begroting voor een boekjaar"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Van:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Tot:</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Button onClick={handleExportPdf} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Afdrukken
            </Button>
          </div>
        </div>

        {/* Printable Budget */}
        <div id="budget-content" className="bg-background print:bg-white print:text-black space-y-8">
          {/* Header */}
          <Card className="card-elevated print:shadow-none print:border-0">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{ORGANIZATION.name}</h2>
                  <p className="text-muted-foreground print:text-gray-600">
                    Ond.nr. <strong>{ORGANIZATION.enterpriseNumber}</strong>
                  </p>
                  <p className="text-muted-foreground print:text-gray-600">
                    {ORGANIZATION.address}
                  </p>
                  <p className="text-muted-foreground print:text-gray-600">
                    {ORGANIZATION.postalCode} {ORGANIZATION.city}
                  </p>
                </div>
              </div>
              <h1 className="text-2xl font-bold mt-6 underline">
                BEGROTING {formatPeriod()}
              </h1>
            </CardContent>
          </Card>

          {/* Begroting van ontvangsten en uitgaven */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">
                Begroting van ontvangsten en uitgaven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
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
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetExpenses.goederen_diensten || ""}
                            onChange={(e) =>
                              setBudgetExpenses({
                                ...budgetExpenses,
                                goederen_diensten: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Bezoldigingen</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetExpenses.bezoldigingen || ""}
                            onChange={(e) =>
                              setBudgetExpenses({
                                ...budgetExpenses,
                                bezoldigingen: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Diensten en diverse goederen</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetExpenses.diensten_diverse || ""}
                            onChange={(e) =>
                              setBudgetExpenses({
                                ...budgetExpenses,
                                diensten_diverse: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Andere uitgaven</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetExpenses.andere_uitgaven || ""}
                            onChange={(e) =>
                              setBudgetExpenses({
                                ...budgetExpenses,
                                andere_uitgaven: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal uitgaven</td>
                        <td className="text-right py-2">{formatCurrency(totalExpenses)}</td>
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
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetIncome.lidgeld || ""}
                            onChange={(e) =>
                              setBudgetIncome({
                                ...budgetIncome,
                                lidgeld: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Schenkingen en Legaten</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetIncome.schenkingen || ""}
                            onChange={(e) =>
                              setBudgetIncome({
                                ...budgetIncome,
                                schenkingen: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Subsidies</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetIncome.subsidies || ""}
                            onChange={(e) =>
                              setBudgetIncome({
                                ...budgetIncome,
                                subsidies: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Andere ontvangsten</td>
                        <td className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={budgetIncome.andere_ontvangsten || ""}
                            onChange={(e) =>
                              setBudgetIncome({
                                ...budgetIncome,
                                andere_ontvangsten: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right h-8 print:border-0 print:bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal ontvangsten</td>
                        <td className="text-right py-2">{formatCurrency(totalIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Begroting van het vermogen */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">Begroting van het vermogen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                {/* Bezittingen */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Bezittingen
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INVENTORY_TYPES.bezittingen.map((type) => (
                        <tr key={type.value} className="border-b">
                          <td className="py-1 text-xs">{type.label}</td>
                          <td className="text-right py-1 font-mono">
                            {inventoryByType.bezittingen[type.value]
                              ? formatCurrency(inventoryByType.bezittingen[type.value])
                              : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal bezitingen</td>
                        <td className="text-right py-2">{formatCurrency(inventoryTotals.bezittingen)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Schulden */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Schulden
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INVENTORY_TYPES.schulden.map((type) => (
                        <tr key={type.value} className="border-b">
                          <td className="py-1 text-xs">{type.label}</td>
                          <td className="text-right py-1 font-mono">
                            {inventoryByType.schulden[type.value]
                              ? formatCurrency(inventoryByType.schulden[type.value])
                              : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal schulden</td>
                        <td className="text-right py-2">{formatCurrency(inventoryTotals.schulden)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rechten & Verplichtingen */}
              <div className="grid grid-cols-2 gap-8 mt-8">
                {/* Rechten */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Rechten
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INVENTORY_TYPES.rechten.map((type) => (
                        <tr key={type.value} className="border-b">
                          <td className="py-1 text-xs">{type.label}</td>
                          <td className="text-right py-1 font-mono">
                            {inventoryByType.rechten[type.value]
                              ? formatCurrency(inventoryByType.rechten[type.value])
                              : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Totaal rechten</td>
                        <td className="text-right py-2">{formatCurrency(inventoryTotals.rechten)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Verplichtingen */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-foreground print:border-black">
                        <th className="text-left py-2 font-semibold" colSpan={2}>
                          Verplichtingen
                        </th>
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1">Omschrijving</th>
                        <th className="text-right py-1">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INVENTORY_TYPES.verplichtingen.map((type) => (
                        <tr key={type.value} className="border-b">
                          <td className="py-1 text-xs">{type.label}</td>
                          <td className="text-right py-1 font-mono">
                            {inventoryByType.verplichtingen[type.value]
                              ? formatCurrency(inventoryByType.verplichtingen[type.value])
                              : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-foreground print:border-black">
                        <td className="py-2">Andere verplichtingen</td>
                        <td className="text-right py-2">{formatCurrency(inventoryTotals.verplichtingen)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval and Signature */}
          <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
            <CardContent className="pt-6 space-y-4">
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
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">Getekend:</p>
                <Input
                  placeholder="naam bestuurder"
                  value={signatory}
                  onChange={(e) => setSignatory(e.target.value)}
                  className="mt-2 w-64 border-0 border-b rounded-none print:border-0 print:bg-transparent"
                />
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
        }
      `}</style>
    </MainLayout>
  );
}
