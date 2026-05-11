import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Cadastro · Velora Broker" }] }),
  component: () => <AuthForm mode="register" />,
});
