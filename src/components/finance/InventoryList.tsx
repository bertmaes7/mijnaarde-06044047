import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  INVENTORY_TYPES,
  type InventoryItem,
  type InventoryItemInsert,
} from "@/hooks/useInventory";

interface InventoryListProps {
  fiscalYear: number;
}

const formatCurrency = (amount: number) => {
  return amount.toFixed(2).replace(".", ",");
};

const CATEGORY_LABELS: Record<string, string> = {
  bezittingen: "Bezittingen",
  schulden: "Schulden",
  rechten: "Rechten",
  verplichtingen: "Verplichtingen",
};

type CategoryType = keyof typeof INVENTORY_TYPES;

export function InventoryList({ fiscalYear }: InventoryListProps) {
  const { data: inventory = [], isLoading } = useInventory(fiscalYear);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<{
    category: CategoryType;
    type: string;
    description: string;
    amount: string;
    notes: string;
  }>({
    category: "bezittingen",
    type: "",
    description: "",
    amount: "",
    notes: "",
  });

  // Group inventory by category
  const groupedInventory = useMemo(() => {
    const groups: Record<CategoryType, InventoryItem[]> = {
      bezittingen: [],
      schulden: [],
      rechten: [],
      verplichtingen: [],
    };

    inventory.forEach((item) => {
      const cat = item.category as CategoryType;
      if (groups[cat]) {
        groups[cat].push(item);
      }
    });

    return groups;
  }, [inventory]);

  // Calculate totals per category
  const categoryTotals = useMemo(() => {
    return {
      bezittingen: groupedInventory.bezittingen.reduce((sum, i) => sum + Number(i.amount), 0),
      schulden: groupedInventory.schulden.reduce((sum, i) => sum + Number(i.amount), 0),
      rechten: groupedInventory.rechten.reduce((sum, i) => sum + Number(i.amount), 0),
      verplichtingen: groupedInventory.verplichtingen.reduce((sum, i) => sum + Number(i.amount), 0),
    };
  }, [groupedInventory]);

  const getTypeLabel = (category: CategoryType, typeValue: string) => {
    const types = INVENTORY_TYPES[category];
    const found = types.find((t) => t.value === typeValue);
    return found?.label || typeValue;
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category: item.category as CategoryType,
        type: item.type,
        description: item.description,
        amount: String(item.amount),
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        category: "bezittingen",
        type: "",
        description: "",
        amount: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCategoryChange = (cat: CategoryType) => {
    setFormData({ ...formData, category: cat, type: "" });
  };

  const handleSubmit = () => {
    const itemData: InventoryItemInsert = {
      fiscal_year: fiscalYear,
      category: formData.category,
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      notes: formData.notes || null,
    };

    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, data: itemData, fiscalYear },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createItem.mutate(itemData, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
      deleteItem.mutate({ id, fiscalYear });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Card className="card-elevated print:shadow-none print:border print:border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle className="text-lg">Inventarislijst vermogensbestanddelen</CardTitle>
        <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Item toevoegen
        </Button>
      </CardHeader>
      <CardHeader className="hidden print:flex">
        <CardTitle className="text-lg">Inventarislijst vermogensbestanddelen</CardTitle>
      </CardHeader>
      <CardContent>
        {inventory.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nog geen items toegevoegd. Klik op "Item toevoegen" om te beginnen.
          </p>
        ) : (
          <Accordion type="multiple" defaultValue={["bezittingen", "schulden", "rechten", "verplichtingen"]}>
            {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map((category) => {
              const items = groupedInventory[category];
              if (items.length === 0) return null;

              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="text-base font-semibold">
                    <div className="flex items-center gap-4">
                      <span>{CATEGORY_LABELS[category]}</span>
                      <Badge variant="secondary" className="font-mono">
                        € {formatCurrency(categoryTotals[category])}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aard</TableHead>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead className="text-right">Bedrag</TableHead>
                          <TableHead className="w-[100px] print:hidden">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              {getTypeLabel(category, item.type)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span>{item.description}</span>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              € {formatCurrency(Number(item.amount))}
                            </TableCell>
                            <TableCell className="print:hidden">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell colSpan={2}>Subtotaal {CATEGORY_LABELS[category]}</TableCell>
                          <TableCell className="text-right font-mono">
                            € {formatCurrency(categoryTotals[category])}
                          </TableCell>
                          <TableCell className="print:hidden" />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Summary totals */}
        {inventory.length > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map((category) => (
              <div key={category}>
                <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[category]}</p>
                <p className="text-lg font-semibold font-mono">
                  € {formatCurrency(categoryTotals[category])}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Item bewerken" : "Nieuw item toevoegen"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => handleCategoryChange(v as CategoryType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Aard</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_TYPES[formData.category].map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Omschrijving</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Bijv. Auto Toyota Yaris, Bankrekening KBC..."
                />
              </div>

              <div className="space-y-2">
                <Label>Bedrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Opmerkingen (optioneel)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Extra informatie..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.type || !formData.description}
              >
                {editingItem ? "Opslaan" : "Toevoegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
