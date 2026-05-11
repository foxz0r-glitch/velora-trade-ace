import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getToken()) throw redirect({ to: "/trade" });
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
