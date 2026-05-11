import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · Velora Broker" }] }),
  component: () => <AuthForm mode="login" />,
});
