import { useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "member";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  memberId: string | null;
  passwordChangeRequired: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    roles: [],
    isAdmin: false,
    memberId: null,
    passwordChangeRequired: false,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = (rolesData || []).map((r) => r.role as AppRole);

      // Fetch member data including password_change_required
      const { data: memberData } = await supabase
        .from("members")
        .select("id, password_change_required")
        .eq("auth_user_id", userId)
        .maybeSingle();

      setState((prev) => ({
        ...prev,
        roles,
        isAdmin: roles.includes("admin"),
        memberId: memberData?.id || null,
        passwordChangeRequired: memberData?.password_change_required ?? false,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching user data:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // When a new session is detected, set isLoading to true to prevent
      // premature redirects before roles are fetched
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: session?.user ? true : prev.isLoading,
      }));

      // Defer data fetching with setTimeout to prevent deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
      } else {
        setState((prev) => ({
          ...prev,
          roles: [],
          isAdmin: false,
          memberId: null,
          passwordChangeRequired: false,
          isLoading: false,
        }));
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...state,
    signInWithPassword,
    signInWithMagicLink,
    signUp,
    signOut,
  };
}
