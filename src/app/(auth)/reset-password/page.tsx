import Link from "next/link";
import { AuthCard } from "@/features/auth/presentation/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/presentation/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Choisis un mot de passe d'au moins 8 caractères."
      footer={
        <Link
          href="/login"
          className="font-medium text-[color:var(--primary)] hover:underline"
        >
          ← Retour à la connexion
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
