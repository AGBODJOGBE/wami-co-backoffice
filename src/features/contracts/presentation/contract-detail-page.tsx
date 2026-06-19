"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DataTable,
  type ColumnDef,
} from "@/shared/ui/data-table";
import {
  DetailHeader,
  InfoGrid,
  type InfoRow,
} from "@/shared/ui/detail-header";
import { formatDate } from "@/shared/lib/format";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
  PAYMENT_FREQUENCY_LABELS,
  driverFullName,
  formatXof,
  vehicleLabel,
  type Contract,
  type ContractInstallment,
  type ContractStatus,
  type InstallmentStatus,
} from "../domain/contract";
import { ContractBreakModal } from "./contract-break-modal";

interface Props {
  contract: Contract;
  installments: ContractInstallment[];
}

export function ContractDetailPage({ contract, installments }: Props) {
  const router = useRouter();
  const [breakOpen, setBreakOpen] = useState(false);

  const canBreak = contract.status === "ACTIVE" || contract.status === "PENDING";

  const contractInfo: InfoRow[] = [
    { label: "Identifiant", value: contract.contractId },
    {
      label: "Statut",
      value: (
        <Badge tone={CONTRACT_STATUS_TONES[contract.status as ContractStatus]}>
          {CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
        </Badge>
      ),
    },
    { label: "Date de début", value: formatDate(contract.dateDebut) },
    {
      label: "Date de fin estimée",
      value: contract.dateFin ? formatDate(contract.dateFin) : `${contract.dureeMois} mois`,
    },
    { label: "Durée", value: `${contract.dureeMois} mois` },
    {
      label: "Fréquence de paiement",
      value: PAYMENT_FREQUENCY_LABELS[contract.frequencePaiement],
    },
  ];

  const financialInfo: InfoRow[] = [
    { label: "Montant total", value: formatXof(contract.montantTotal) },
    { label: "Apport initial", value: formatXof(contract.apport) },
    {
      label: "Capital financé",
      value: formatXof(contract.montantTotal - contract.apport),
    },
    {
      label: "Taux d'intérêt annuel",
      value: `${(contract.tauxInteret * 100).toFixed(2)} %`,
    },
    {
      label: "Montant par échéance",
      value:
        contract.montantMensuel != null
          ? formatXof(contract.montantMensuel)
          : "—",
    },
    {
      label: "Restant à payer",
      value:
        contract.montantRestant != null
          ? formatXof(contract.montantRestant)
          : "—",
    },
    {
      label: "Progression",
      value:
        contract.echeancesTotal != null && contract.echeancesPayees != null
          ? `${contract.echeancesPayees} / ${contract.echeancesTotal} échéances`
          : "—",
    },
  ];

  const driverInfo: InfoRow[] = [
    { label: "Identifiant driver", value: contract.driver.driverId },
    { label: "Prénom", value: contract.driver.firstName },
    { label: "Nom", value: contract.driver.lastName },
    { label: "Téléphone", value: contract.driver.phoneNumber },
  ];

  const vehicleInfo: InfoRow[] = [
    { label: "Identifiant véhicule", value: contract.vehicle.vehicleId },
    { label: "Marque", value: contract.vehicle.make },
    { label: "Modèle", value: contract.vehicle.model },
    { label: "Immatriculation", value: contract.vehicle.licensePlate },
    { label: "Type", value: contract.vehicle.vehicleType },
  ];

  const installmentColumns: ColumnDef<ContractInstallment>[] = [
    {
      key: "numero",
      header: "#",
      sortAccessor: (row) => row.numero,
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--muted-foreground)]">
          {String(row.numero).padStart(2, "0")}
        </span>
      ),
    },
    {
      key: "echeance",
      header: "Échéance",
      sortAccessor: (row) => row.dateEcheance,
      render: (row) => (
        <span className="text-sm text-[color:var(--foreground)]">
          {formatDate(row.dateEcheance)}
        </span>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.montant,
      render: (row) => (
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {formatXof(row.montant)}
        </span>
      ),
    },
    {
      key: "paiement",
      header: "Payé le",
      sortAccessor: (row) => row.datePaiement ?? "",
      render: (row) => (
        <span className="text-sm text-[color:var(--foreground)]">
          {row.datePaiement ? formatDate(row.datePaiement) : "—"}
        </span>
      ),
    },
    {
      key: "retard",
      header: "Retard",
      align: "center",
      render: (row) =>
        row.retardJours && row.retardJours > 0 ? (
          <span className="text-sm text-[color:var(--danger)]">
            {row.retardJours} j
          </span>
        ) : (
          <span className="text-sm text-[color:var(--muted-foreground)]">—</span>
        ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      render: (row) => (
        <Badge
          tone={
            INSTALLMENT_STATUS_TONES[row.status as InstallmentStatus] ?? "neutral"
          }
        >
          {INSTALLMENT_STATUS_LABELS[row.status as InstallmentStatus] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/contracts"
        backLabel="Retour aux contrats"
        eyebrow="Contrat location-vente"
        title={`${driverFullName(contract.driver)} — ${vehicleLabel(contract.vehicle)}`}
        status={
          <Badge tone={CONTRACT_STATUS_TONES[contract.status as ContractStatus]}>
            {CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
          </Badge>
        }
        subtitle={`Contrat #${contract.contractId.slice(0, 8)} · Créé le ${formatDate(contract.createdAt)}`}
        actions={
          canBreak ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setBreakOpen(true)}
            >
              <ShieldOff className="size-4" />
              Résilier le contrat
            </Button>
          ) : undefined
        }
      />

      {contract.breakReason ? (
        <div className="rounded-lg border border-[color:var(--danger)]/30 bg-red-50 px-4 py-3 dark:bg-red-500/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--danger)]">
            Motif de résiliation
          </p>
          <p className="mt-1 text-sm text-[color:var(--foreground)]">
            {contract.breakReason}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations du contrat</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={contractInfo} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions financières</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={financialInfo} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={driverInfo} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={vehicleInfo} columns={2} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-[color:var(--border)]">
          <CardTitle>Échéancier ({installments.length} échéances)</CardTitle>
        </CardHeader>
        {installments.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucune échéance enregistrée pour ce contrat.
          </div>
        ) : (
          <DataTable
            rows={installments}
            columns={installmentColumns}
            rowKey={(row) => row.installmentId}
            defaultSort={{ key: "numero", direction: "asc" }}
            emptyMessage="Aucune échéance."
          />
        )}
      </Card>

      <ContractBreakModal
        open={breakOpen}
        contractId={contract.contractId}
        onClose={() => setBreakOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
