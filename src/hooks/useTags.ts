import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Tag = {
  id: string;
  name: string;
  created_at: string;
};

export type MemberTag = {
  id: string;
  member_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
};

// Fetch all available tags
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Tag[];
    },
  });
}

// Fetch tags for a specific member
export function useMemberTags(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-tags", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("member_tags")
        .select(`
          *,
          tag:tags(*)
        `)
        .eq("member_id", memberId);
      if (error) throw error;
      return data as (MemberTag & { tag: Tag })[];
    },
    enabled: !!memberId,
  });
}

// Create a new tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      // Check if tag already exists (case-insensitive)
      const { data: existing } = await supabase
        .from("tags")
        .select("*")
        .ilike("name", name)
        .maybeSingle();
      
      if (existing) {
        return existing as Tag;
      }

      const { data, error } = await supabase
        .from("tags")
        .insert({ name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

// Add tag to member
export function useAddMemberTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, tagId }: { memberId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from("member_tags")
        .insert({ member_id: memberId, tag_id: tagId })
        .select(`
          *,
          tag:tags(*)
        `)
        .single();
      if (error) {
        if (error.message.includes("duplicate")) {
          throw new Error("Deze tag is al toegevoegd");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ["member-tags", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Fout bij toevoegen tag");
    },
  });
}

// Remove tag from member
export function useRemoveMemberTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, tagId }: { memberId: string; tagId: string }) => {
      const { error } = await supabase
        .from("member_tags")
        .delete()
        .eq("member_id", memberId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ["member-tags", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => {
      toast.error("Fout bij verwijderen tag");
    },
  });
}

// Delete a tag entirely
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["member-tags"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Tag verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen tag");
    },
  });
}

// Bulk add tag to multiple members
export function useBulkAddTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberIds, tagId }: { memberIds: string[]; tagId: string }) => {
      const inserts = memberIds.map(memberId => ({
        member_id: memberId,
        tag_id: tagId,
      }));
      
      const { error } = await supabase
        .from("member_tags")
        .upsert(inserts, { onConflict: "member_id,tag_id", ignoreDuplicates: true });
      if (error) throw error;
      return memberIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["member-tags"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(`Tag toegevoegd aan ${count} leden`);
    },
    onError: () => {
      toast.error("Fout bij toevoegen tag");
    },
  });
}

// Bulk remove tag from multiple members
export function useBulkRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberIds, tagId }: { memberIds: string[]; tagId: string }) => {
      const { error } = await supabase
        .from("member_tags")
        .delete()
        .eq("tag_id", tagId)
        .in("member_id", memberIds);
      if (error) throw error;
      return memberIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["member-tags"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(`Tag verwijderd van ${count} leden`);
    },
    onError: () => {
      toast.error("Fout bij verwijderen tag");
    },
  });
}
