"use server";

import { redirect } from "next/navigation";
import type { LoginPayload } from "@/features/auth/domain/entity/admin";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import { createSession, destroySession } from "./session";

export interface LoginFormState {
  message?: string;
  fieldErrors?: {
    phone?: string;
    password?: string;
  };
  /** Echoed back so the form can repopulate fields after an error. */
  values?: {
    phone?: string;
    remember?: boolean;
  };
}

const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/;

export async function loginAction(
  _state: LoginFormState | undefined,
  formData: FormData,
): Promise<LoginFormState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const echoValues = { phone, remember };

  const fieldErrors: LoginFormState["fieldErrors"] = {};
  if (!phone) fieldErrors.phone = "Le numéro de téléphone est requis.";
  else if (!PHONE_REGEX.test(phone))
    fieldErrors.phone = "Format de téléphone invalide.";
  if (!password) fieldErrors.password = "Le mot de passe est requis.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: echoValues };
  }

  let payload: LoginPayload;
  try {
    payload = await apiFetch<LoginPayload>(API_ROUTES.admin.login(), {
      method: "POST",
      authenticated: false,
      body: { phone, password },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        `[loginAction] login failed phone=${phone} status=${error.status} message=${error.message}${
          error.errors ? ` errors=${JSON.stringify(error.errors)}` : ""
        }`,
      );
      const prefix =
        error.status === 0
          ? "Backend injoignable"
          : error.status === 401
            ? "Identifiants invalides"
            : `Erreur ${error.status}`;
      return {
        message: `${prefix} — ${error.message}`,
        values: echoValues,
      };
    }
    console.error(
      `[loginAction] unexpected error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
    );
    return {
      message:
        error instanceof Error
          ? `Erreur inattendue : ${error.message}`
          : "Erreur inattendue.",
      values: echoValues,
    };
  }

  console.log(
    `[loginAction] login success adminId=${payload.admin.adminId} role=${payload.admin.role?.name}`,
  );
  await createSession(payload.token, payload.admin);
  redirect("/");
}

export interface ChangePasswordResult {
  ok: boolean;
  message: string;
}

const PASSWORD_RULES_MESSAGE =
  "8 caractères minimum, avec une majuscule, une minuscule et un chiffre.";

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  if (!currentPassword || !newPassword) {
    return { ok: false, message: "Renseigne le mot de passe actuel et le nouveau." };
  }
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    return { ok: false, message: `Nouveau mot de passe trop faible : ${PASSWORD_RULES_MESSAGE}` };
  }
  if (newPassword === currentPassword) {
    return { ok: false, message: "Le nouveau mot de passe doit être différent de l'actuel." };
  }
  try {
    await apiFetch<unknown>(API_ROUTES.admin.changePassword(), {
      method: "PUT",
      body: { currentPassword, newPassword },
      preserveSessionOn401: true,
    });
    return { ok: true, message: "Mot de passe modifié." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Modification impossible.",
    };
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
