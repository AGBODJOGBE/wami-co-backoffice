import Link from "next/link";
import { cookies } from "next/headers";
import { AuthCard } from "@/features/auth/presentation/components/auth-card";
import { LoginForm } from "@/features/auth/presentation/components/login-form";
import { SESSION_EXPIRED_FLAG_COOKIE } from "@/features/auth/application/session-cookie";

export default async function LoginPage() {
  const store = await cookies();
  const sessionExpired = Boolean(store.get(SESSION_EXPIRED_FLAG_COOKIE)?.value);

  return (
    <AuthCard
      title="Connexion"
      description="Entre tes identifiants admin pour accéder à la console."
      footer={
        <>
          Besoin d&apos;aide ?{" "}
          <Link
            href="mailto:support@4u-foryou.com"
            className="font-medium text-[color:var(--primary)] hover:underline"
          >
            support@4u-foryou.com
          </Link>
        </>
      }
    >
      {sessionExpired ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Votre session a expiré — reconnectez-vous. (Si vous venez de réinitialiser votre mot de
          passe, c&apos;est normal : ça déconnecte vos autres sessions ouvertes.)
        </div>
      ) : null}
      <LoginForm />
    </AuthCard>
  );
}
