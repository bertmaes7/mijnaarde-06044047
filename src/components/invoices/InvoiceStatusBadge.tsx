 import { Badge } from "@/components/ui/badge";
 import { InvoiceStatus } from "@/hooks/useInvoices";
 
 const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
   draft: { label: "Concept", variant: "secondary" },
   sent: { label: "Verzonden", variant: "outline" },
   paid: { label: "Betaald", variant: "default" },
   overdue: { label: "Vervallen", variant: "destructive" },
 };
 
 interface InvoiceStatusBadgeProps {
   status: InvoiceStatus;
 }
 
 export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
   const config = statusConfig[status] || statusConfig.draft;
   
   return (
     <Badge variant={config.variant}>
       {config.label}
     </Badge>
   );
 }