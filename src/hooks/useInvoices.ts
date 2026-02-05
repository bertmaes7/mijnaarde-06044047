 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
 
 export type Invoice = {
   id: string;
   invoice_number: string;
   invoice_year: number;
   invoice_sequence: number;
   member_id: string | null;
   company_id: string | null;
   description: string;
   invoice_date: string;
   due_date: string;
   status: InvoiceStatus;
   subtotal: number;
   vat_rate: number;
   vat_amount: number;
   total: number;
   paid_amount: number;
   paid_at: string | null;
   reminder_count: number;
   last_reminder_at: string | null;
   notes: string | null;
   pdf_url: string | null;
   created_at: string;
   updated_at: string;
   sent_at: string | null;
   member?: { id: string; first_name: string; last_name: string; email: string | null } | null;
   company?: { id: string; name: string; email: string | null } | null;
   items?: InvoiceItem[];
 };
 
 export type InvoiceItem = {
   id: string;
   invoice_id: string;
   description: string;
   quantity: number;
   unit_price: number;
   vat_rate: number;
   total: number;
   sort_order: number;
   created_at: string;
   updated_at: string;
 };
 
 export type CreateInvoiceData = {
   member_id?: string | null;
   company_id?: string | null;
   description: string;
   invoice_date: string;
   due_date: string;
   notes?: string | null;
   items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>[];
 };
 
 export type UpdateInvoiceData = Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'member' | 'company' | 'items'>>;
 
 // Fetch all invoices
 export function useInvoices() {
   return useQuery({
     queryKey: ["invoices"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("invoices")
         .select(`
           *,
           member:members(id, first_name, last_name, email),
           company:companies(id, name, email)
         `)
         .order("invoice_date", { ascending: false });
       if (error) throw error;
       return data as Invoice[];
     },
   });
 }
 
 // Fetch single invoice with items
 export function useInvoice(id: string | undefined) {
   return useQuery({
     queryKey: ["invoice", id],
     queryFn: async () => {
       if (!id) return null;
       
       const { data: invoice, error: invoiceError } = await supabase
         .from("invoices")
         .select(`
           *,
           member:members(id, first_name, last_name, email),
           company:companies(id, name, email)
         `)
         .eq("id", id)
         .maybeSingle();
       
       if (invoiceError) throw invoiceError;
       if (!invoice) return null;
       
       const { data: items, error: itemsError } = await supabase
         .from("invoice_items")
         .select("*")
         .eq("invoice_id", id)
         .order("sort_order", { ascending: true });
       
       if (itemsError) throw itemsError;
       
       return { ...invoice, items: items || [] } as Invoice;
     },
     enabled: !!id,
   });
 }
 
 // Generate next invoice number
 export async function getNextInvoiceNumber(): Promise<{ number: string; year: number; sequence: number }> {
   const year = new Date().getFullYear();
   
   const { data, error } = await supabase
     .rpc("generate_invoice_number", { p_year: year });
   
   if (error) throw error;
   
   // Parse the sequence from the generated number
   const parts = (data as string).split('-');
   const sequence = parseInt(parts[1], 10);
   
   return { number: data as string, year, sequence };
 }
 
 // Create invoice
 export function useCreateInvoice() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (data: CreateInvoiceData) => {
       // Generate invoice number
       const { number, year, sequence } = await getNextInvoiceNumber();
       
       // Calculate totals
       let subtotal = 0;
       data.items.forEach(item => {
         subtotal += item.quantity * item.unit_price;
       });
       
       // Use weighted average VAT rate
       const vatAmount = data.items.reduce((sum, item) => {
         return sum + (item.quantity * item.unit_price * item.vat_rate / 100);
       }, 0);
       
       const total = subtotal + vatAmount;
       const avgVatRate = subtotal > 0 ? (vatAmount / subtotal) * 100 : 21;
       
       // Insert invoice
       const { data: newInvoice, error: invoiceError } = await supabase
         .from("invoices")
         .insert({
           invoice_number: number,
           invoice_year: year,
           invoice_sequence: sequence,
           member_id: data.member_id || null,
           company_id: data.company_id || null,
           description: data.description,
           invoice_date: data.invoice_date,
           due_date: data.due_date,
           notes: data.notes || null,
           subtotal,
           vat_rate: Math.round(avgVatRate * 100) / 100,
           vat_amount: Math.round(vatAmount * 100) / 100,
           total: Math.round(total * 100) / 100,
         })
         .select()
         .single();
       
       if (invoiceError) throw invoiceError;
       
       // Insert invoice items
       if (data.items.length > 0) {
         const itemsToInsert = data.items.map((item, index) => ({
           invoice_id: newInvoice.id,
           description: item.description,
           quantity: item.quantity,
           unit_price: item.unit_price,
           vat_rate: item.vat_rate,
           total: Math.round(item.quantity * item.unit_price * (1 + item.vat_rate / 100) * 100) / 100,
           sort_order: index,
         }));
         
         const { error: itemsError } = await supabase
           .from("invoice_items")
           .insert(itemsToInsert);
         
         if (itemsError) throw itemsError;
       }
       
       return newInvoice;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       toast.success("Factuur aangemaakt");
     },
     onError: (error) => {
       console.error("Error creating invoice:", error);
       toast.error("Fout bij aanmaken van factuur");
     },
   });
 }
 
 // Update invoice
 export function useUpdateInvoice() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, data, items }: { 
       id: string; 
       data: UpdateInvoiceData;
       items?: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>[];
     }) => {
       // If items are provided, recalculate totals
       if (items) {
         let subtotal = 0;
         items.forEach(item => {
           subtotal += item.quantity * item.unit_price;
         });
         
         const vatAmount = items.reduce((sum, item) => {
           return sum + (item.quantity * item.unit_price * item.vat_rate / 100);
         }, 0);
         
         const total = subtotal + vatAmount;
         const avgVatRate = subtotal > 0 ? (vatAmount / subtotal) * 100 : 21;
         
         data.subtotal = subtotal;
         data.vat_rate = Math.round(avgVatRate * 100) / 100;
         data.vat_amount = Math.round(vatAmount * 100) / 100;
         data.total = Math.round(total * 100) / 100;
         
         // Delete existing items and insert new ones
         const { error: deleteError } = await supabase
           .from("invoice_items")
           .delete()
           .eq("invoice_id", id);
         
         if (deleteError) throw deleteError;
         
         if (items.length > 0) {
           const itemsToInsert = items.map((item, index) => ({
             invoice_id: id,
             description: item.description,
             quantity: item.quantity,
             unit_price: item.unit_price,
             vat_rate: item.vat_rate,
             total: Math.round(item.quantity * item.unit_price * (1 + item.vat_rate / 100) * 100) / 100,
             sort_order: index,
           }));
           
           const { error: itemsError } = await supabase
             .from("invoice_items")
             .insert(itemsToInsert);
           
           if (itemsError) throw itemsError;
         }
       }
       
       const { error } = await supabase
         .from("invoices")
         .update(data)
         .eq("id", id);
       
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       queryClient.invalidateQueries({ queryKey: ["invoice"] });
       toast.success("Factuur bijgewerkt");
     },
     onError: (error) => {
       console.error("Error updating invoice:", error);
       toast.error("Fout bij bijwerken van factuur");
     },
   });
 }
 
 // Delete invoice
 export function useDeleteInvoice() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("invoices").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       toast.success("Factuur verwijderd");
     },
     onError: () => {
       toast.error("Fout bij verwijderen van factuur");
     },
   });
 }
 
 // Mark invoice as paid
 export function useMarkInvoicePaid() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, paidAmount }: { id: string; paidAmount?: number }) => {
       // Get invoice to know total
       const { data: invoice, error: fetchError } = await supabase
         .from("invoices")
         .select("total")
         .eq("id", id)
         .single();
       
       if (fetchError) throw fetchError;
       
       const { error } = await supabase
         .from("invoices")
         .update({
           status: 'paid',
           paid_amount: paidAmount ?? invoice.total,
           paid_at: new Date().toISOString(),
         })
         .eq("id", id);
       
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       toast.success("Factuur gemarkeerd als betaald");
     },
     onError: () => {
       toast.error("Fout bij markeren als betaald");
     },
   });
 }
 
 // Send invoice (calls edge function)
 export function useSendInvoice() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { data, error } = await supabase.functions.invoke('send-invoice', {
         body: { invoiceId: id, type: 'invoice' },
       });
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       toast.success("Factuur verzonden");
     },
     onError: (error) => {
       console.error("Error sending invoice:", error);
       toast.error("Fout bij verzenden van factuur");
     },
   });
 }
 
 // Send reminder (calls edge function)
 export function useSendReminder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { data, error } = await supabase.functions.invoke('send-invoice', {
         body: { invoiceId: id, type: 'reminder' },
       });
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["invoices"] });
       toast.success("Herinnering verzonden");
     },
     onError: (error) => {
       console.error("Error sending reminder:", error);
       toast.error("Fout bij verzenden van herinnering");
     },
   });
 }