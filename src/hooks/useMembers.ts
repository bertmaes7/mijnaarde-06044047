import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, Member } from "@/lib/supabase";
import { toast } from "sonner";

export type MemberWithTags = Member & {
  member_tags?: { tag_id: string; tag: { id: string; name: string } }[];
};

export function useMembers(search?: string) {
  return useQuery({
    queryKey: ["members", search],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select(`
          *,
          company:companies(*),
          member_tags(
            tag_id,
            tag:tags(id, name)
          )
        `)
        .order("last_name", { ascending: true });

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MemberWithTags[];
    },
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          company:companies(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!id,
  });
}

// Check if email already exists (case-insensitive)
export function useCheckEmailExists() {
  return useMutation({
    mutationFn: async ({ email, excludeMemberId }: { email: string; excludeMemberId?: string }) => {
      if (!email) return false;
      
      let query = supabase
        .from("members")
        .select("id, first_name, last_name")
        .ilike("email", email);
      
      if (excludeMemberId) {
        query = query.neq("id", excludeMemberId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    },
  });
}

// Find duplicate emails
export function useDuplicateEmails() {
  return useQuery({
    queryKey: ["duplicate-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .not("email", "is", null)
        .order("email", { ascending: true });
      
      if (error) throw error;
      
      // Group by lowercase email and find duplicates
      const emailMap = new Map<string, typeof data>();
      for (const member of data || []) {
        const lowerEmail = member.email!.toLowerCase();
        if (!emailMap.has(lowerEmail)) {
          emailMap.set(lowerEmail, []);
        }
        emailMap.get(lowerEmail)!.push(member);
      }
      
      // Return only duplicates
      const duplicates: { email: string; members: typeof data }[] = [];
      for (const [email, members] of emailMap) {
        if (members.length > 1) {
          duplicates.push({ email, members });
        }
      }
      
      return duplicates;
    },
  });
}

// Bulk update members
export function useBulkUpdateMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      memberIds, 
      field, 
      value 
    }: { 
      memberIds: string[]; 
      field: string; 
      value: boolean | string | null;
    }) => {
      const { error } = await supabase
        .from("members")
        .update({ [field]: value })
        .in("id", memberIds);
      
      if (error) throw error;
      return memberIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(`${count} leden bijgewerkt`);
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van leden");
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Member, "id" | "created_at" | "updated_at" | "company">>;
    }) => {
      const { error } = await supabase
        .from("members")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
      toast.success("Lid succesvol bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van lid");
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<Member, "id" | "created_at" | "updated_at" | "company">
    ) => {
      const { data: newMember, error } = await supabase
        .from("members")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Nieuw lid aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij het aanmaken van lid");
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Lid verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van lid");
    },
  });
}
