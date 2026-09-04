import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify } from "@/lib/slugify";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useCreateProduct, useUpdateProduct, Product } from "@/hooks/useProducts";

const productSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  slug: z
    .string()
    .min(1, "Slug is verplicht")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Enkel kleine letters, cijfers en koppeltekens"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  price: z.coerce.number().min(0, "Prijs moet 0 of hoger zijn"),
  vat_rate: z.coerce.number(),
  sku: z.string().optional(),
  stock_quantity: z.coerce
    .number()
    .int("Moet een geheel getal zijn")
    .min(0, "Mag niet negatief zijn")
    .optional(),
  is_published: z.boolean(),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const emptyDefaults: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  category_id: "",
  price: 0,
  vat_rate: 21,
  sku: "",
  stock_quantity: 0,
  is_published: false,
  is_active: true,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { data: categories = [] } = useProductCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;

    if (product) {
      form.reset({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        category_id: product.category_id || "",
        price: product.price,
        vat_rate: product.vat_rate,
        sku: product.sku || "",
        stock_quantity: product.stock_quantity,
        is_published: product.is_published,
        is_active: product.is_active,
      });
      setSlugTouched(true);
    } else {
      form.reset(emptyDefaults);
      setSlugTouched(false);
    }
  }, [product, open, form]);

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!slugTouched) {
      form.setValue("slug", slugify(value));
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      category_id: values.category_id || null,
      price: values.price,
      vat_rate: values.vat_rate,
      sku: values.sku || null,
      is_published: values.is_published,
      is_active: values.is_active,
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, data: payload });
    } else {
      await createProduct.mutateAsync({
        ...payload,
        stock_quantity: values.stock_quantity ?? 0,
      });
    }
    onOpenChange(false);
  };

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Product bewerken" : "Nieuw product"}</DialogTitle>
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
                      placeholder="Bijv. Herbruikbare waterfles"
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
                      placeholder="herbruikbare-waterfles"
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
                    <Textarea {...field} rows={3} placeholder="Korte productomschrijving..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Geen categorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Geen categorie</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Artikelnummer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prijs (€) *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BTW-tarief</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="21">21%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="6">6%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {product ? (
                <div className="space-y-2">
                  <FormLabel>Voorraad</FormLabel>
                  <p className="pt-2 text-sm text-muted-foreground">
                    {product.stock_quantity} stuks —{" "}
                    <Link
                      to="/webshop/voorraad"
                      className="underline"
                      onClick={() => onOpenChange(false)}
                    >
                      aanpassen via Voorraad
                    </Link>
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startvoorraad</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="1" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">Gepubliceerd</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
