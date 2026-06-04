import Link from "next/link";
import { AuthCard } from "@/features/auth/presentation/components/auth-card";
import { LoginForm } from "@/features/auth/presentation/components/login-form";

export default function LoginPage() {
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
      <LoginForm />
    </AuthCard>
  );
}
