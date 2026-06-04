"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  loginAction,
  type LoginFormState,
} from "@/features/auth/application/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Téléphone"
        type="tel"
        name="phone"
        autoComplete="tel"
        placeholder="+229 61 00 00 00"
        leftIcon={<Phone className="size-4" />}
        error={state?.fieldErrors?.phone}
        defaultValue={state?.values?.phone ?? ""}
        required
      />

      <Input
        label="Mot de passe"
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        leftIcon={<Lock className="size-4" />}
        error={state?.fieldErrors?.password}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            // onMouseDown (with preventDefault so focus stays in the input)
            // fires earlier in the event sequence than any overlay a
            // password manager injects on real HTTPS origins. onClick
            // alone gets swallowed under ngrok / prod even though it
            // works on localhost.
            onMouseDown={(e) => {
              e.preventDefault();
              setShowPassword((v) => !v);
            }}
            className="cursor-pointer rounded-md p-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
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
      />

      {state?.message ? (
        <p
          role="alert"
          className="rounded-md border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[color:var(--muted-foreground)]">
          <input
            type="checkbox"
            name="remember"
            defaultChecked={state?.values?.remember ?? false}
            className="size-4 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
          />
          Rester connecté
        </label>
        <Link
          href="/forgot-password"
          className="font-medium text-[color:var(--primary)] hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isPending}>
        Se connecter
      </Button>

      <p className="text-center text-xs text-[color:var(--muted-foreground)]">
        Accès réservé au personnel autorisé. Contactez un super-admin pour
        demander un compte.
      </p>
    </form>
  );
}
