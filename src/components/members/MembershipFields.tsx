import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

interface MembershipFieldsProps {
  control: Control<any>;
}

export function MembershipFields({ control }: MembershipFieldsProps) {
  const toggleFields = [
    { name: "receives_mail", label: "Ontvangt mail" },
    { name: "is_board_member", label: "Bestuur" },
    { name: "is_active_member", label: "Actief lid" },
    { name: "is_ambassador", label: "Ambassadeur" },
    { name: "is_donor", label: "Donateur" },
    { name: "is_council_member", label: "Raad van wijzen" },
  ];

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5 text-primary" />
          Lidmaatschap
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {toggleFields.map((field) => (
          <FormField
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="cursor-pointer">{field.label}</FormLabel>
                <FormControl>
                  <Switch
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}
