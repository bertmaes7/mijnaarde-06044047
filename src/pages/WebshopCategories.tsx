import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { slugify } from "@/lib/slugify";
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  ProductCategory,
} from "@/hooks/useProductCategories";

const categorySchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  slug: z
    .string()
    .min(1, "Slug is verplicht")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Enkel kleine letters, cijfers en koppeltekens"),
  description: z.string().optional(),
  sort_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const emptyDefaults: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  sort_order: 0,
  is_active: true,
};

export default function WebshopCategories() {
  const { data: categories = [], isLoading } = useProductCategories();
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const editingCategory = categories.find((c) => c.id === editingCategoryId) || null;
  const deletingCategory = categories.find((c) => c.id === deletingCategoryId) || null;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!isFormOpen) return;

    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description || "",
        sort_order: editingCategory.sort_order,
        is_active: editingCategory.is_active,
      });
      setSlugTouched(true);
    } else {
      form.reset(emptyDefaults);
      setSlugTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCategory, isFormOpen]);

  const handleAddNew = () => {
    setEditingCategoryId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setIsFormOpen(true);
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!slugTouched) {
      form.setValue("slug", slugify(value));
    }
  };

  const onSubmit = async (values: CategoryFormValues) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      sort_order: values.sort_order,
      is_active: values.is_active,
    };

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, data: payload });
    } else {
      await createCategory.mutateAsync(payload);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategoryId) return;
    await deleteCategory.mutateAsync(deletingCategoryId);
    setDeletingCategoryId(null);
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Categorieën"
          description="Groepeer producten in categorieën voor de webshop"
          actions={
            <Button className="gap-2" onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
              Nieuwe categorie
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Nog geen categorieën aangemaakt</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Naam</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Volgorde</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                      <TableCell className="text-right">{category.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Bewerken"
                            onClick={() => handleEdit(category.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Verwijderen"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingCategoryId(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Categorie bewerken" : "Nieuwe categorie"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Bijv. Kleding"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          setSlugTouched(true);
                          field.onChange(e);
                        }}
                        placeholder="kleding"
                      />
                    </FormControl>
                    <FormDescription>Gebruikt in de webshop-URL</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschrijving</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Optionele omschrijving..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volgorde</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">Actief</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingCategoryId}
        onOpenChange={(open) => !open && setDeletingCategoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Categorie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deletingCategory?.name}" wilt verwijderen? Producten in deze
              categorie blijven bestaan, maar verliezen hun categorie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
