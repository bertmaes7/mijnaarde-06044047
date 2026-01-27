import { ExternalLink, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface WebsitePreviewProps {
  url: string | null;
}

export function WebsitePreview({ url }: WebsitePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (!url) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Website Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Voeg een persoonlijke URL toe om een preview te zien.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Ensure URL has protocol
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Website Preview
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Sluiten
                </>
              ) : (
                "Preview"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(fullUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Openen
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 truncate">{fullUrl}</p>
        {showPreview && (
          <div className="relative rounded-lg border overflow-hidden bg-background">
            {loadError ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p className="text-center">
                  Preview niet beschikbaar.<br />
                  <span className="text-sm">De website blokkeert embedding.</span>
                </p>
              </div>
            ) : (
              <iframe
                src={fullUrl}
                title="Website Preview"
                className="w-full h-[300px] border-0"
                sandbox="allow-scripts allow-same-origin"
                onError={() => setLoadError(true)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
