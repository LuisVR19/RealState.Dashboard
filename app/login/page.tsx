import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión · Panel Thomas Mata S.A." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if ((await getSession()).me) redirect("/");
  const { next, error } = await searchParams;
  return (
    <div className="login">
      <div className="login-art">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=75" alt="" />
        <div className="login-art-shade" />
        <div className="login-art-text">
          <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 }}>Panel interno</span>
          <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15 }}>Publica, edita y da seguimiento a cada propiedad y cada visita.</span>
        </div>
      </div>
      <div className="login-side">
        <LoginForm siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"} next={typeof next === "string" ? next.slice(0, 300) : undefined} linkError={error === "enlace"} />
      </div>
    </div>
  );
}
