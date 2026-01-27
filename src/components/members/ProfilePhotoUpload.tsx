import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface ProfilePhotoUploadProps {
  currentUrl: string | null;
  onUpload: (url: string | null) => void;
  memberId?: string;
}

export function ProfilePhotoUpload({
  currentUrl,
  onUpload,
  memberId,
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Selecteer een afbeelding");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Afbeelding mag niet groter zijn dan 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${memberId || crypto.randomUUID()}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      onUpload(data.publicUrl);
      toast.success("Foto geüpload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fout bij uploaden van foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onUpload(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {isUploading ? "Uploaden..." : "Foto uploaden"}
      </Button>
      {currentUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
          Verwijderen
        </Button>
      )}
    </div>
  );
}
