import { useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";

export type Profile = { id: string; name: string; email: string; balance: number; demoBalance: number };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const p = await api.profile();
      setProfile(p);
    } catch (e) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { profile, loading, refresh, setProfile };
}
