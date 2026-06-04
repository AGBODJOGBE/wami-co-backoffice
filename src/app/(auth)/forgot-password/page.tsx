import Link from "next/link";
import { AuthCard } from "@/features/auth/presentation/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/presentation/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entre l'email du compte admin. Nous t'enverrons un lien de réinitialisation."
      footer={
        <Link
          href="/login"
          className="font-medium text-[color:var(--primary)] hover:underline"
        >
          ← Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
