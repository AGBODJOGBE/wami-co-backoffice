import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <ShieldOff className="h-10 w-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
        <p className="max-w-sm text-sm text-gray-500">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          Contactez votre administrateur.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
