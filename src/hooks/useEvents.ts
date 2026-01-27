import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  max_participants: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRegistration = {
  id: string;
  event_id: string;
  member_id: string;
  status: 'confirmed' | 'cancelled' | 'waitlist';
  registered_at: string;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
};

export type EventWithRegistrations = Event & {
  registrations: EventRegistration[];
  registration_count: number;
};

// Admin: fetch all events
export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });
}

// Public: fetch published events
export function usePublishedEvents() {
  return useQuery({
    queryKey: ["published-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });
}

// Fetch single event with registrations
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      if (!id) return null;
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return null;

      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select(`
          *,
          member:members(id, first_name, last_name, email)
        `)
        .eq("event_id", id)
        .eq("status", "confirmed")
        .order("registered_at", { ascending: true });
      if (regError) throw regError;

      return {
        ...event,
        registrations: registrations || [],
        registration_count: registrations?.length || 0,
      } as EventWithRegistrations;
    },
    enabled: !!id,
  });
}

// Public event fetch (no auth required for published events)
export function usePublicEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!id,
  });
}

// Get registration count for an event
export function useEventRegistrationCount(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-registration-count", eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const { count, error } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
  });
}

// Check if current user is registered
export function useMyEventRegistration(eventId: string | undefined) {
  return useQuery({
    queryKey: ["my-event-registration", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as EventRegistration | null;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: newEvent, error } = await supabase
        .from("events")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij aanmaken event");
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Event> }) => {
      const { error } = await supabase
        .from("events")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      toast.success("Event bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken event");
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen event");
    },
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, memberId }: { eventId: string; memberId: string }) => {
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          member_id: memberId,
          status: "confirmed",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-event-registration", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-registration-count", variables.eventId] });
      toast.success("Inschrijving bevestigd!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Je bent al ingeschreven voor dit event");
      } else {
        toast.error("Fout bij inschrijven");
      }
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, memberId }: { eventId: string; memberId: string }) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("event_id", eventId)
        .eq("member_id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-event-registration", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-registration-count", variables.eventId] });
      toast.success("Inschrijving geannuleerd");
    },
    onError: () => {
      toast.error("Fout bij annuleren");
    },
  });
}
