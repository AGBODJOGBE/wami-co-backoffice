"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { forgotAdminPasswordAction } from "@/features/auth/application/actions";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await forgotAdminPasswordAction(phoneNumber);
    setIsPending(false);
    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.message);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[color:var(--border)] bg-emerald-50 p-5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="size-6" />
          <p>
            Si un compte admin correspond à ce numéro, un code de vérification
            à 6 chiffres vient d&apos;être envoyé par SMS. Il expire dans 10
            minutes.
          </p>
        </div>
        <Button variant="outline" fullWidth onClick={() => router.push("/reset-password")}>
          J&apos;ai reçu le code →
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Téléphone du compte admin"
        type="tel"
        name="phoneNumber"
        autoComplete="tel"
        placeholder="+229 01 XX XX XX XX"
        leftIcon={<Phone className="size-4" />}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        error={error ?? undefined}
        required
      />

      <Button type="submit" fullWidth isLoading={isPending}>
        Envoyer le code par SMS
      </Button>
    </form>
  );
}
