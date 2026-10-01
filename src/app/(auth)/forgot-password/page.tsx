import Link from "next/link";
import { AuthCard } from "@/features/auth/presentation/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/presentation/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entre le téléphone du compte admin. Nous t'enverrons un code de vérification par SMS."
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
