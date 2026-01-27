import { Member, Company } from "./supabase";

// CSV column headers mapping
const MEMBER_CSV_HEADERS = [
  "Voornaam",
  "Achternaam",
  "E-mail",
  "Telefoon",
  "Mobiel",
  "Adres",
  "Postcode",
  "Stad",
  "Land",
  "Persoonlijke URL",
  "Bedrijf",
  "Actief",
  "Notities",
];

const MEMBER_FIELD_MAP: Record<string, keyof Omit<Member, "id" | "created_at" | "updated_at" | "company" | "profile_photo_url">> = {
  "Voornaam": "first_name",
  "Achternaam": "last_name",
  "E-mail": "email",
  "Telefoon": "phone",
  "Mobiel": "mobile",
  "Adres": "address",
  "Postcode": "postal_code",
  "Stad": "city",
  "Land": "country",
  "Persoonlijke URL": "personal_url",
  "Notities": "notes",
};

function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function exportMembersToCSV(members: Member[]): string {
  const rows: string[] = [];
  
  // Header row
  rows.push(MEMBER_CSV_HEADERS.join(","));
  
  // Data rows
  for (const member of members) {
    const row = [
      escapeCSVValue(member.first_name),
      escapeCSVValue(member.last_name),
      escapeCSVValue(member.email),
      escapeCSVValue(member.phone),
      escapeCSVValue(member.mobile),
      escapeCSVValue(member.address),
      escapeCSVValue(member.postal_code),
      escapeCSVValue(member.city),
      escapeCSVValue(member.country),
      escapeCSVValue(member.personal_url),
      escapeCSVValue(member.company?.name),
      member.is_active ? "Ja" : "Nee",
      escapeCSVValue(member.notes),
    ];
    rows.push(row.join(","));
  }
  
  return rows.join("\n");
}

export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedMember {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  personal_url?: string;
  company_name?: string;
  is_active: boolean;
  notes?: string;
}

export interface CSVParseResult {
  members: ParsedMember[];
  errors: string[];
}

export function parseCSV(csvContent: string, companies: Company[]): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const members: ParsedMember[] = [];
  const errors: string[] = [];
  
  if (lines.length < 2) {
    errors.push("CSV bestand is leeg of bevat alleen headers");
    return { members, errors };
  }
  
  const headers = parseCSVLine(lines[0]);
  
  // Validate required headers
  const requiredHeaders = ["Voornaam", "Achternaam"];
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Verplichte kolom ontbreekt: ${required}`);
    }
  }
  
  if (errors.length > 0) {
    return { members, errors };
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const rowNum = i + 1;
    
    try {
      const getValue = (header: string): string => {
        const index = headers.indexOf(header);
        return index >= 0 ? values[index] || "" : "";
      };
      
      const firstName = getValue("Voornaam").trim();
      const lastName = getValue("Achternaam").trim();
      
      if (!firstName || !lastName) {
        errors.push(`Rij ${rowNum}: Voornaam en achternaam zijn verplicht`);
        continue;
      }
      
      const companyName = getValue("Bedrijf").trim();
      const isActiveValue = getValue("Actief").toLowerCase();
      const isActive = isActiveValue === "" || isActiveValue === "ja" || isActiveValue === "true" || isActiveValue === "1";
      
      members.push({
        first_name: firstName,
        last_name: lastName,
        email: getValue("E-mail") || undefined,
        phone: getValue("Telefoon") || undefined,
        mobile: getValue("Mobiel") || undefined,
        address: getValue("Adres") || undefined,
        postal_code: getValue("Postcode") || undefined,
        city: getValue("Stad") || undefined,
        country: getValue("Land") || "België",
        personal_url: getValue("Persoonlijke URL") || undefined,
        company_name: companyName || undefined,
        is_active: isActive,
        notes: getValue("Notities") || undefined,
      });
    } catch (e) {
      errors.push(`Rij ${rowNum}: Fout bij het verwerken van de rij`);
    }
  }
  
  return { members, errors };
}

export function generateTemplateCSV(): string {
  const headers = MEMBER_CSV_HEADERS.join(",");
  const example = [
    "Jan",
    "Janssen",
    "jan@voorbeeld.be",
    "+32 2 123 45 67",
    "+32 470 12 34 56",
    "Hoofdstraat 123",
    "1000",
    "Brussel",
    "België",
    "https://www.jan.be",
    "Acme BV",
    "Ja",
    "Voorbeeld notitie",
  ].join(",");
  
  return `${headers}\n${example}`;
}
