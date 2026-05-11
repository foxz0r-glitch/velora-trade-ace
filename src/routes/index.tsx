import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: () => <Navigate to={getToken() ? "/trade" : "/login"} />,
});
