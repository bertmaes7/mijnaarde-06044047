import { ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WebsitePreviewProps {
  url: string | null;
}

export function WebsitePreview({ url }: WebsitePreviewProps) {
  if (!url) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Website
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Voeg een persoonlijke URL toe om deze hier te tonen.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Ensure URL has protocol
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  
  // Extract domain for display
  let displayDomain = url;
  try {
    const urlObj = new URL(fullUrl);
    displayDomain = urlObj.hostname.replace("www.", "");
  } catch {
    // Keep original if parsing fails
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Website
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{displayDomain}</p>
              <p className="text-xs text-muted-foreground truncate">{fullUrl}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(fullUrl, "_blank")}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Openen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
