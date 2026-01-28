import { useState, useEffect } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { getReceiptSignedUrl } from "@/hooks/useFinance";

interface ReceiptLinkProps {
  receiptUrl: string | null;
}

export function ReceiptLink({ receiptUrl }: ReceiptLinkProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!receiptUrl) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getReceiptSignedUrl(receiptUrl).then((url) => {
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [receiptUrl]);

  if (!receiptUrl) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!signedUrl) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-primary hover:underline"
    >
      <FileText className="h-4 w-4" />
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
