 import { useState } from "react";
 import { format } from "date-fns";
 import { nl } from "date-fns/locale";
 import { MoreHorizontal, Send, Bell, CheckCircle, Pencil, Trash2, Eye } from "lucide-react";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
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
 import { Invoice, useDeleteInvoice, useSendInvoice, useSendReminder, useMarkInvoicePaid } from "@/hooks/useInvoices";
 import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
 import { InvoiceFormDialog } from "./InvoiceFormDialog";
 import { InvoiceDetailDialog } from "./InvoiceDetailDialog";
 
 interface InvoicesTableProps {
   invoices: Invoice[];
   isLoading: boolean;
 }
 
 export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
   const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
   const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
   const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
   const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null);
   const [sendingReminder, setSendingReminder] = useState<Invoice | null>(null);
   const [markingPaid, setMarkingPaid] = useState<Invoice | null>(null);
 
   const deleteInvoice = useDeleteInvoice();
   const sendInvoice = useSendInvoice();
   const sendReminder = useSendReminder();
   const markPaid = useMarkInvoicePaid();
 
   const getCustomerName = (invoice: Invoice) => {
     if (invoice.member) {
       return `${invoice.member.first_name} ${invoice.member.last_name}`;
     }
     if (invoice.company) {
       return invoice.company.name;
     }
     return "-";
   };
 
   const handleDelete = async () => {
     if (!deletingInvoice) return;
     await deleteInvoice.mutateAsync(deletingInvoice.id);
     setDeletingInvoice(null);
   };
 
   const handleSend = async () => {
     if (!sendingInvoice) return;
     await sendInvoice.mutateAsync(sendingInvoice.id);
     setSendingInvoice(null);
   };
 
   const handleReminder = async () => {
     if (!sendingReminder) return;
     await sendReminder.mutateAsync(sendingReminder.id);
     setSendingReminder(null);
   };
 
   const handleMarkPaid = async () => {
     if (!markingPaid) return;
     await markPaid.mutateAsync({ id: markingPaid.id });
     setMarkingPaid(null);
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center h-64">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
       </div>
     );
   }
 
   if (invoices.length === 0) {
     return (
       <div className="text-center py-12 text-muted-foreground">
         Geen facturen gevonden. Maak je eerste factuur aan!
       </div>
     );
   }
 
   return (
     <>
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead>Nummer</TableHead>
             <TableHead>Klant</TableHead>
             <TableHead>Omschrijving</TableHead>
             <TableHead>Datum</TableHead>
             <TableHead>Vervaldatum</TableHead>
             <TableHead className="text-right">Bedrag</TableHead>
             <TableHead>Status</TableHead>
             <TableHead className="w-12"></TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {invoices.map((invoice) => (
             <TableRow key={invoice.id}>
               <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
               <TableCell>{getCustomerName(invoice)}</TableCell>
               <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
               <TableCell>{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}</TableCell>
               <TableCell>{format(new Date(invoice.due_date), "d MMM yyyy", { locale: nl })}</TableCell>
               <TableCell className="text-right font-medium">€ {invoice.total.toFixed(2)}</TableCell>
               <TableCell>
                 <InvoiceStatusBadge status={invoice.status as any} />
               </TableCell>
               <TableCell>
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon">
                       <MoreHorizontal className="h-4 w-4" />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={() => setViewingInvoice(invoice)}>
                       <Eye className="h-4 w-4 mr-2" />
                       Bekijken
                     </DropdownMenuItem>
                     {invoice.status === 'draft' && (
                       <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                         <Pencil className="h-4 w-4 mr-2" />
                         Bewerken
                       </DropdownMenuItem>
                     )}
                     <DropdownMenuSeparator />
                     {(invoice.status === 'draft' || invoice.status === 'sent') && (
                       <DropdownMenuItem onClick={() => setSendingInvoice(invoice)}>
                         <Send className="h-4 w-4 mr-2" />
                         {invoice.status === 'draft' ? 'Verzenden' : 'Opnieuw verzenden'}
                       </DropdownMenuItem>
                     )}
                     {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                       <DropdownMenuItem onClick={() => setSendingReminder(invoice)}>
                         <Bell className="h-4 w-4 mr-2" />
                         Herinnering sturen
                       </DropdownMenuItem>
                     )}
                     {invoice.status !== 'paid' && (
                       <DropdownMenuItem onClick={() => setMarkingPaid(invoice)}>
                         <CheckCircle className="h-4 w-4 mr-2" />
                         Markeren als betaald
                       </DropdownMenuItem>
                     )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                       onClick={() => setDeletingInvoice(invoice)}
                       className="text-destructive"
                     >
                       <Trash2 className="h-4 w-4 mr-2" />
                       Verwijderen
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
 
       {/* Edit Dialog */}
       <InvoiceFormDialog
         open={!!editingInvoice}
         onOpenChange={(open) => !open && setEditingInvoice(null)}
         invoice={editingInvoice}
       />
 
       {/* View Dialog */}
       <InvoiceDetailDialog
         open={!!viewingInvoice}
         onOpenChange={(open) => !open && setViewingInvoice(null)}
         invoiceId={viewingInvoice?.id}
       />
 
       {/* Delete Confirmation */}
       <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
             <AlertDialogDescription>
               Weet je zeker dat je factuur {deletingInvoice?.invoice_number} wilt verwijderen?
               Deze actie kan niet ongedaan worden gemaakt.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Annuleren</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
               Verwijderen
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Send Confirmation */}
       <AlertDialog open={!!sendingInvoice} onOpenChange={(open) => !open && setSendingInvoice(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Factuur verzenden?</AlertDialogTitle>
             <AlertDialogDescription>
               Factuur {sendingInvoice?.invoice_number} wordt per e-mail verzonden naar de klant.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Annuleren</AlertDialogCancel>
             <AlertDialogAction onClick={handleSend}>
               Verzenden
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Reminder Confirmation */}
       <AlertDialog open={!!sendingReminder} onOpenChange={(open) => !open && setSendingReminder(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Herinnering versturen?</AlertDialogTitle>
             <AlertDialogDescription>
               Een betalingsherinnering voor factuur {sendingReminder?.invoice_number} wordt verzonden.
               {sendingReminder && sendingReminder.reminder_count > 0 && (
                 <span className="block mt-2 text-warning">
                   Er zijn al {sendingReminder.reminder_count} herinnering(en) verstuurd.
                 </span>
               )}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Annuleren</AlertDialogCancel>
             <AlertDialogAction onClick={handleReminder}>
               Herinnering versturen
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Mark Paid Confirmation */}
       <AlertDialog open={!!markingPaid} onOpenChange={(open) => !open && setMarkingPaid(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Markeren als betaald?</AlertDialogTitle>
             <AlertDialogDescription>
               Factuur {markingPaid?.invoice_number} van € {markingPaid?.total.toFixed(2)} wordt gemarkeerd als betaald.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Annuleren</AlertDialogCancel>
             <AlertDialogAction onClick={handleMarkPaid}>
               Markeren als betaald
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }