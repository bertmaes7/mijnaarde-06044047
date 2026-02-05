 import { useState, useEffect } from "react";
 import { useForm, useFieldArray } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { z } from "zod";
 import { format, addDays } from "date-fns";
 import { nl } from "date-fns/locale";
 import { Plus, Trash2, CalendarIcon } from "lucide-react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from "@/components/ui/form";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Calendar } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { SearchableSelect } from "@/components/finance/SearchableSelect";
 import { useMembers } from "@/hooks/useMembers";
 import { useCompanies } from "@/hooks/useCompanies";
 import { useCreateInvoice, useUpdateInvoice, Invoice } from "@/hooks/useInvoices";
 import { cn } from "@/lib/utils";
 
 const invoiceItemSchema = z.object({
   description: z.string().min(1, "Omschrijving is verplicht"),
   quantity: z.coerce.number().min(0.01, "Aantal moet groter dan 0 zijn"),
   unit_price: z.coerce.number().min(0, "Prijs moet 0 of hoger zijn"),
   vat_rate: z.coerce.number().min(0).max(100),
 });
 
 const invoiceSchema = z.object({
   customer_type: z.enum(["member", "company"]),
   member_id: z.string().optional(),
   company_id: z.string().optional(),
   description: z.string().min(1, "Omschrijving is verplicht"),
   invoice_date: z.date(),
   due_date: z.date(),
   notes: z.string().optional(),
   items: z.array(invoiceItemSchema).min(1, "Voeg minimaal één regel toe"),
 }).refine(
   (data) => {
     if (data.customer_type === "member") return !!data.member_id;
     return !!data.company_id;
   },
   { message: "Selecteer een klant", path: ["member_id"] }
 );
 
 type InvoiceFormValues = z.infer<typeof invoiceSchema>;
 
 interface InvoiceFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   invoice?: Invoice | null;
 }
 
 export function InvoiceFormDialog({ open, onOpenChange, invoice }: InvoiceFormDialogProps) {
   const { data: members = [] } = useMembers();
   const { data: companies = [] } = useCompanies();
   const createInvoice = useCreateInvoice();
   const updateInvoice = useUpdateInvoice();
   
   const [customerType, setCustomerType] = useState<"member" | "company">("member");
   
   const form = useForm<InvoiceFormValues>({
     resolver: zodResolver(invoiceSchema),
     defaultValues: {
       customer_type: "member",
       member_id: "",
       company_id: "",
       description: "",
       invoice_date: new Date(),
       due_date: addDays(new Date(), 30),
       notes: "",
       items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 21 }],
     },
   });
 
   const { fields, append, remove } = useFieldArray({
     control: form.control,
     name: "items",
   });
 
   useEffect(() => {
     if (invoice) {
       const isCompany = !!invoice.company_id;
       setCustomerType(isCompany ? "company" : "member");
       
       form.reset({
         customer_type: isCompany ? "company" : "member",
         member_id: invoice.member_id || "",
         company_id: invoice.company_id || "",
         description: invoice.description,
         invoice_date: new Date(invoice.invoice_date),
         due_date: new Date(invoice.due_date),
         notes: invoice.notes || "",
         items: invoice.items?.map(item => ({
           description: item.description,
           quantity: item.quantity,
           unit_price: item.unit_price,
           vat_rate: item.vat_rate,
         })) || [{ description: "", quantity: 1, unit_price: 0, vat_rate: 21 }],
       });
     } else {
       form.reset({
         customer_type: "member",
         member_id: "",
         company_id: "",
         description: "",
         invoice_date: new Date(),
         due_date: addDays(new Date(), 30),
         notes: "",
         items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 21 }],
       });
       setCustomerType("member");
     }
   }, [invoice, form, open]);
 
   const memberOptions = members
     .filter(m => m.is_active)
     .map(m => ({
       value: m.id,
       label: `${m.first_name} ${m.last_name}`,
     }));
 
   const companyOptions = companies.map(c => ({
     value: c.id,
     label: c.name,
   }));
 
   const watchedItems = form.watch("items");
   const subtotal = watchedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
   const vatAmount = watchedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.vat_rate / 100), 0);
   const total = subtotal + vatAmount;
 
   const onSubmit = async (values: InvoiceFormValues) => {
     try {
       if (invoice) {
         await updateInvoice.mutateAsync({
           id: invoice.id,
           data: {
             member_id: values.customer_type === "member" ? values.member_id : null,
             company_id: values.customer_type === "company" ? values.company_id : null,
             description: values.description,
             invoice_date: format(values.invoice_date, "yyyy-MM-dd"),
             due_date: format(values.due_date, "yyyy-MM-dd"),
             notes: values.notes || null,
           },
           items: values.items.map((item, index) => ({
             description: item.description,
             quantity: item.quantity,
             unit_price: item.unit_price,
             vat_rate: item.vat_rate,
             total: item.quantity * item.unit_price * (1 + item.vat_rate / 100),
             sort_order: index,
           })),
         });
       } else {
         await createInvoice.mutateAsync({
           member_id: values.customer_type === "member" ? values.member_id : null,
           company_id: values.customer_type === "company" ? values.company_id : null,
           description: values.description,
           invoice_date: format(values.invoice_date, "yyyy-MM-dd"),
           due_date: format(values.due_date, "yyyy-MM-dd"),
           notes: values.notes || null,
           items: values.items.map((item, index) => ({
             description: item.description,
             quantity: item.quantity,
             unit_price: item.unit_price,
             vat_rate: item.vat_rate,
             total: item.quantity * item.unit_price * (1 + item.vat_rate / 100),
             sort_order: index,
           })),
         });
       }
       onOpenChange(false);
     } catch (error) {
       console.error("Error saving invoice:", error);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>
             {invoice ? "Factuur bewerken" : "Nieuwe factuur"}
           </DialogTitle>
         </DialogHeader>
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* Customer Type Selection */}
             <div className="flex gap-4">
               <Button
                 type="button"
                 variant={customerType === "member" ? "default" : "outline"}
                 onClick={() => {
                   setCustomerType("member");
                   form.setValue("customer_type", "member");
                   form.setValue("company_id", "");
                 }}
               >
                 Lid
               </Button>
               <Button
                 type="button"
                 variant={customerType === "company" ? "default" : "outline"}
                 onClick={() => {
                   setCustomerType("company");
                   form.setValue("customer_type", "company");
                   form.setValue("member_id", "");
                 }}
               >
                 Bedrijf
               </Button>
             </div>
 
             {/* Customer Selection */}
             {customerType === "member" ? (
               <FormField
                 control={form.control}
                 name="member_id"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Lid</FormLabel>
                     <FormControl>
                       <SearchableSelect
                         options={memberOptions}
                         value={field.value || ""}
                         onValueChange={field.onChange}
                         placeholder="Selecteer een lid..."
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             ) : (
               <FormField
                 control={form.control}
                 name="company_id"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Bedrijf</FormLabel>
                     <FormControl>
                       <SearchableSelect
                         options={companyOptions}
                         value={field.value || ""}
                         onValueChange={field.onChange}
                         placeholder="Selecteer een bedrijf..."
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             )}
 
             {/* Description */}
             <FormField
               control={form.control}
               name="description"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Omschrijving</FormLabel>
                   <FormControl>
                     <Input {...field} placeholder="Bijv. Contributie 2026" />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             {/* Dates */}
             <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="invoice_date"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>Factuurdatum</FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-full pl-3 text-left font-normal",
                               !field.value && "text-muted-foreground"
                             )}
                           >
                             {field.value ? (
                               format(field.value, "d MMMM yyyy", { locale: nl })
                             ) : (
                               <span>Kies een datum</span>
                             )}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           locale={nl}
                         />
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
 
               <FormField
                 control={form.control}
                 name="due_date"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>Vervaldatum</FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-full pl-3 text-left font-normal",
                               !field.value && "text-muted-foreground"
                             )}
                           >
                             {field.value ? (
                               format(field.value, "d MMMM yyyy", { locale: nl })
                             ) : (
                               <span>Kies een datum</span>
                             )}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           locale={nl}
                         />
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             {/* Invoice Items */}
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <FormLabel>Factuurregels</FormLabel>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => append({ description: "", quantity: 1, unit_price: 0, vat_rate: 21 })}
                 >
                   <Plus className="h-4 w-4 mr-1" />
                   Regel toevoegen
                 </Button>
               </div>
 
               <div className="space-y-3">
                 {fields.map((field, index) => (
                   <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded-lg">
                     <div className="col-span-5">
                       <FormField
                         control={form.control}
                         name={`items.${index}.description`}
                         render={({ field }) => (
                           <FormItem>
                             {index === 0 && <FormLabel className="text-xs">Omschrijving</FormLabel>}
                             <FormControl>
                               <Input {...field} placeholder="Omschrijving" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                     <div className="col-span-2">
                       <FormField
                         control={form.control}
                         name={`items.${index}.quantity`}
                         render={({ field }) => (
                           <FormItem>
                             {index === 0 && <FormLabel className="text-xs">Aantal</FormLabel>}
                             <FormControl>
                               <Input {...field} type="number" step="0.01" min="0" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                     <div className="col-span-2">
                       <FormField
                         control={form.control}
                         name={`items.${index}.unit_price`}
                         render={({ field }) => (
                           <FormItem>
                             {index === 0 && <FormLabel className="text-xs">Prijs</FormLabel>}
                             <FormControl>
                               <Input {...field} type="number" step="0.01" min="0" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                     <div className="col-span-2">
                       <FormField
                         control={form.control}
                         name={`items.${index}.vat_rate`}
                         render={({ field }) => (
                           <FormItem>
                             {index === 0 && <FormLabel className="text-xs">BTW %</FormLabel>}
                             <FormControl>
                               <Input {...field} type="number" step="1" min="0" max="100" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                     <div className="col-span-1 flex items-end">
                       {fields.length > 1 && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="h-10 w-10 text-destructive"
                           onClick={() => remove(index)}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
 
               {/* Totals */}
               <div className="border-t pt-4 space-y-2">
                 <div className="flex justify-between text-sm">
                   <span>Subtotaal</span>
                   <span>€ {subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span>BTW</span>
                   <span>€ {vatAmount.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between font-semibold text-lg">
                   <span>Totaal</span>
                   <span>€ {total.toFixed(2)}</span>
                 </div>
               </div>
             </div>
 
             {/* Notes */}
             <FormField
               control={form.control}
               name="notes"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Notities (optioneel)</FormLabel>
                   <FormControl>
                     <Textarea {...field} rows={3} placeholder="Interne notities..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             {/* Actions */}
             <div className="flex justify-end gap-3">
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                 Annuleren
               </Button>
               <Button type="submit" disabled={createInvoice.isPending || updateInvoice.isPending}>
                 {invoice ? "Opslaan" : "Factuur aanmaken"}
               </Button>
             </div>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }