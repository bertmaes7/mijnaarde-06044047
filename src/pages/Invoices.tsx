import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Construction } from "lucide-react";

export default function Invoices() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Uitgaande Facturen
            </h1>
            <p className="mt-1 text-muted-foreground">
              Beheer facturen naar klanten
            </p>
          </div>
        </div>

        {/* Draft Notice */}
        <Card className="card-elevated border-dashed border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Construction className="h-5 w-5" />
              In Ontwikkeling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Facturatie Module</h3>
                  <p className="text-muted-foreground max-w-md">
                    Deze module is momenteel in ontwikkeling. Binnenkort kun je hier:
                  </p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-xs mx-auto">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    Facturen aanmaken en verzenden
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    Betalingsstatus bijhouden
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    Herinneringen versturen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    BTW-overzichten genereren
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
