import { Control, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Instagram, ExternalLink } from "lucide-react";

// TikTok icon component (not in lucide-react)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface SocialMediaFieldsProps {
  control: Control<any>;
}

function SocialLinkButton({ url }: { url: string | undefined }) {
  if (!url) return null;
  
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => window.open(fullUrl, "_blank")}
    >
      <ExternalLink className="h-4 w-4" />
    </Button>
  );
}

export function SocialMediaFields({ control }: SocialMediaFieldsProps) {
  const facebookUrl = useWatch({ control, name: "facebook_url" });
  const linkedinUrl = useWatch({ control, name: "linkedin_url" });
  const instagramUrl = useWatch({ control, name: "instagram_url" });
  const tiktokUrl = useWatch({ control, name: "tiktok_url" });

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Facebook className="h-5 w-5 text-primary" />
          Social Media
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="facebook_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-[#1877F2]" />
                Facebook
              </FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    placeholder="https://facebook.com/gebruiker"
                    {...field}
                    className="flex-1"
                  />
                  <SocialLinkButton url={facebookUrl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="linkedin_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                LinkedIn
              </FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    placeholder="https://linkedin.com/in/gebruiker"
                    {...field}
                    className="flex-1"
                  />
                  <SocialLinkButton url={linkedinUrl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="instagram_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-[#E4405F]" />
                Instagram
              </FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    placeholder="https://instagram.com/gebruiker"
                    {...field}
                    className="flex-1"
                  />
                  <SocialLinkButton url={instagramUrl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="tiktok_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <TikTokIcon className="h-4 w-4" />
                TikTok
              </FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    placeholder="https://tiktok.com/@gebruiker"
                    {...field}
                    className="flex-1"
                  />
                  <SocialLinkButton url={tiktokUrl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
