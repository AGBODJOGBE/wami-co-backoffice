"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsPending(true);
    // No API logic yet
    setTimeout(() => {
      router.push("/login");
    }, 600);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nouveau mot de passe"
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="new-password"
        placeholder="Minimum 8 caractères"
        leftIcon={<Lock className="size-4" />}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            // See login-form for why onMouseDown — beats password-manager
            // overlays that capture clicks on real HTTPS origins.
            onMouseDown={(e) => {
              e.preventDefault();
              setShowPassword((v) => !v);
            }}
            className="cursor-pointer rounded-md p-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            aria-label={
              showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        }
        required
        minLength={8}
      />

      <Input
        label="Confirmer le mot de passe"
        type={showPassword ? "text" : "password"}
        name="confirm"
        autoComplete="new-password"
        placeholder="Retape le mot de passe"
        leftIcon={<Lock className="size-4" />}
        required
        error={error ?? undefined}
      />

      <Button type="submit" fullWidth isLoading={isPending}>
        Mettre à jour le mot de passe
      </Button>
    </form>
  );
}
