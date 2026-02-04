import { useMemo } from "react";
import { useMailingAssets } from "@/hooks/useMailing";

export interface OrganizationSettings {
  name: string;
  enterpriseNumber: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  directors: Array<{
    name: string;
    rrn: string;
  }>;
  bankAccounts: string[];
  fiscalYearStart: string;
  fiscalYearEnd: string;
}

const DEFAULT_ORGANIZATION: OrganizationSettings = {
  name: "",
  enterpriseNumber: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  postalCode: "",
  city: "",
  country: "België",
  directors: [],
  bankAccounts: [],
  fiscalYearStart: "",
  fiscalYearEnd: "",
};

export function useOrganizationSettings() {
  const { data: assets, isLoading, error } = useMailingAssets();

  const organization = useMemo<OrganizationSettings>(() => {
    if (!assets) return DEFAULT_ORGANIZATION;

    const orgAssets = assets.filter((a) => a.type === "organization");
    const getValueByKey = (key: string) =>
      orgAssets.find((a) => a.key === key)?.value || "";

    // Build directors array
    const directors: OrganizationSettings["directors"] = [];
    for (let i = 1; i <= 4; i++) {
      const name = getValueByKey(`org_director_${i}`);
      const rrn = getValueByKey(`org_director_${i}_rrn`);
      if (name) {
        directors.push({ name, rrn });
      }
    }

    // Build bank accounts array
    const bankAccounts: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const account = getValueByKey(`org_bank_account_${i}`);
      if (account) {
        bankAccounts.push(account);
      }
    }

    return {
      name: getValueByKey("org_name") || "Mijn Aarde vzw",
      enterpriseNumber: getValueByKey("org_enterprise_number"),
      email: getValueByKey("org_email"),
      phone: getValueByKey("org_phone"),
      website: getValueByKey("org_website"),
      address: getValueByKey("org_address"),
      postalCode: getValueByKey("org_postal_code"),
      city: getValueByKey("org_city"),
      country: getValueByKey("org_country") || "België",
      directors,
      bankAccounts,
      fiscalYearStart: getValueByKey("org_fiscal_year_start"),
      fiscalYearEnd: getValueByKey("org_fiscal_year_end"),
    };
  }, [assets]);

  return {
    organization,
    isLoading,
    error,
  };
}
