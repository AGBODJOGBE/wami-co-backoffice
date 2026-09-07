/** Item retourné par GET /api/admin/finance/receivables-overview */
export interface ReceivablesOverviewItem {
  driverId:             string;
  driverName:           string;
  /** XOF centimes — montants contrat non encore encaissés */
  contractReceivable:   number;
  /** XOF centimes — somme des dettes de commission ouvertes */
  commissionReceivable: number;
  /** XOF centimes — contractReceivable + commissionReceivable */
  totalReceivable:      number;
  /** ISO date de la créance la plus ancienne, null si aucune */
  oldestReceivableAt:   string | null;
}

export interface ReceivablesOverviewTotals {
  contractReceivable:   number;
  commissionReceivable: number;
  totalReceivable:      number;
}

export interface ReceivablesOverviewResult {
  drivers: ReceivablesOverviewItem[];
  totals:  ReceivablesOverviewTotals;
  page:    number;
  limit:   number;
  total:   number;
}
