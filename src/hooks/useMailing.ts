import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MailingAsset = {
  id: string;
  key: string;
  label: string;
  type: 'logo' | 'text' | 'organization';
  value: string;
  created_at: string;
  updated_at: string;
};

export type MailingTemplate = {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  created_at: string;
  updated_at: string;
};

export type Mailing = {
  id: string;
  title: string;
  template_id: string | null;
  selection_type: 'all' | 'manual';
  selected_member_ids: string[];
  scheduled_at: string | null;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  template?: MailingTemplate | null;
};

// Assets hooks
export function useMailingAssets() {
  return useQuery({
    queryKey: ["mailing-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mailing_assets")
        .select("*")
        .order("type", { ascending: true });
      if (error) throw error;
      return data as MailingAsset[];
    },
  });
}

export function useUpdateMailingAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("mailing_assets")
        .update({ value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-assets"] });
      toast.success("Asset bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken asset");
    },
  });
}

export function useCreateMailingAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; label: string; type: string; value: string }) => {
      const { data: newAsset, error } = await supabase
        .from("mailing_assets")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-assets"] });
      toast.success("Tekstblok aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij aanmaken tekstblok");
    },
  });
}

export function useDeleteMailingAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mailing_assets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-assets"] });
      toast.success("Tekstblok verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen tekstblok");
    },
  });
}

// Template hooks
export function useMailingTemplates() {
  return useQuery({
    queryKey: ["mailing-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mailing_templates")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as MailingTemplate[];
    },
  });
}

export function useMailingTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["mailing-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("mailing_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as MailingTemplate | null;
    },
    enabled: !!id,
  });
}

export function useCreateMailingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MailingTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: newTemplate, error } = await supabase
        .from("mailing_templates")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-templates"] });
      toast.success("Template aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij aanmaken template");
    },
  });
}

export function useUpdateMailingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MailingTemplate> }) => {
      const { error } = await supabase
        .from("mailing_templates")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-templates"] });
      queryClient.invalidateQueries({ queryKey: ["mailing-template"] });
      toast.success("Template bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken template");
    },
  });
}

export function useDeleteMailingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mailing_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-templates"] });
      toast.success("Template verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen template");
    },
  });
}

// Mailings hooks
export function useMailings() {
  return useQuery({
    queryKey: ["mailings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mailings")
        .select(`
          *,
          template:mailing_templates(*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Mailing[];
    },
  });
}

export function useMailing(id: string | undefined) {
  return useQuery({
    queryKey: ["mailing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("mailings")
        .select(`
          *,
          template:mailing_templates(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Mailing | null;
    },
    enabled: !!id,
  });
}

export function useCreateMailing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      template_id: string | null;
      selection_type: 'all' | 'manual';
      selected_member_ids?: string[];
      scheduled_at?: string | null;
      status?: 'draft' | 'scheduled';
    }) => {
      const { data: newMailing, error } = await supabase
        .from("mailings")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newMailing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailings"] });
      toast.success("Mailing aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij aanmaken mailing");
    },
  });
}

export function useUpdateMailing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Mailing> }) => {
      const { error } = await supabase
        .from("mailings")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailings"] });
      queryClient.invalidateQueries({ queryKey: ["mailing"] });
      toast.success("Mailing bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken mailing");
    },
  });
}

export function useDeleteMailing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mailings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailings"] });
      toast.success("Mailing verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen mailing");
    },
  });
}
