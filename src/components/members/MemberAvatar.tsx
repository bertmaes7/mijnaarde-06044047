import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface MemberAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-xl",
};

export function MemberAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
}: MemberAvatarProps) {
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  const signedUrl = useSignedUrl(photoUrl, "profile-photos");

  return (
    <Avatar className={cn(sizeClasses[size])}>
      <AvatarImage src={signedUrl || undefined} alt={`${firstName} ${lastName}`} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
