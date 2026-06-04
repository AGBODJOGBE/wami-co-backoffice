"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function ForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    // No API logic yet
    setTimeout(() => {
      setIsPending(false);
      setSubmitted(true);
    }, 600);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-[color:var(--border)] bg-emerald-50 p-5 text-center text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="size-6" />
        <p>
          Si l&apos;adresse correspond à un compte admin, un lien de
          réinitialisation vient d&apos;être envoyé. Vérifie ta boîte mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email du compte admin"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="prenom.nom@4u-foryou.com"
        leftIcon={<Mail className="size-4" />}
        required
      />

      <Button type="submit" fullWidth isLoading={isPending}>
        Envoyer le lien
      </Button>
    </form>
  );
}
