import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the file path from a Supabase storage URL
 * @param url The full Supabase storage URL
 * @param bucket The bucket name
 * @returns The file path within the bucket, or null if not a valid storage URL
 */
function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    // URL pattern: /storage/v1/object/public/bucket-name/path/to/file
    const pathMatch = urlObj.pathname.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)`));
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Hook to get a signed URL for a private storage bucket
 * @param publicUrl The original (possibly public) URL stored in the database
 * @param bucket The storage bucket name
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if not available
 */
export function useSignedUrl(
  publicUrl: string | null | undefined,
  bucket: string = "profile-photos",
  expiresIn: number = 3600
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    const filePath = extractPathFromUrl(publicUrl, bucket);
    
    if (!filePath) {
      // If we can't extract a path, it might be an external URL - use as is
      setSignedUrl(publicUrl);
      return;
    }

    const getSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        setSignedUrl(null);
        return;
      }

      setSignedUrl(data.signedUrl);
    };

    getSignedUrl();
  }, [publicUrl, bucket, expiresIn]);

  return signedUrl;
}

/**
 * Synchronous function to create a signed URL (for use outside React components)
 * @param publicUrl The original URL stored in the database
 * @param bucket The storage bucket name
 * @param expiresIn Expiration time in seconds
 * @returns Promise with the signed URL or null
 */
export async function getSignedUrl(
  publicUrl: string | null | undefined,
  bucket: string = "profile-photos",
  expiresIn: number = 3600
): Promise<string | null> {
  if (!publicUrl) return null;

  const filePath = extractPathFromUrl(publicUrl, bucket);
  
  if (!filePath) {
    return publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
