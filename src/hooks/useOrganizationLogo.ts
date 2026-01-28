import { useMailingAssets } from "@/hooks/useMailing";

/**
 * Hook to get the organization logo URL from mailing assets
 * @returns The logo URL or null if not available
 */
export function useOrganizationLogo(): string | null {
  const { data: assets } = useMailingAssets();
  const logoAsset = assets?.find((a) => a.type === "logo");
  return logoAsset?.value || null;
}
