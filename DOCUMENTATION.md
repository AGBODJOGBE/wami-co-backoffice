# ForYouBoard — Documentation Technique Admin Console

> Document de référence pour la prise en main du back-office admin de la plateforme ForYou (VTC + Livraison B2C, Bénin).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Authentification & Système RBAC](#4-authentification--système-rbac)
5. [Modules & Fonctionnalités](#5-modules--fonctionnalités)
6. [Patterns de développement](#6-patterns-de-développement)
7. [Routes API Backend](#7-routes-api-backend)
8. [Navigation & Permissions](#8-navigation--permissions)
9. [Démarrage du projet](#9-démarrage-du-projet)

---

## 1. Vue d'ensemble

ForYouBoard est le **back-office administrateur** de la plateforme ForYou. Il permet à l'équipe opérationnelle de gérer :

- Les **drivers** (validation KYC, suspension, suivi en temps réel)
- Les **courses VTC** (suivi, intervention manuelle)
- Les **véhicules** (flotte plateforme + personnels)
- Les **contrats location-vente** (lease-to-own véhicule)
- Les **wallets & transactions** (finance plateforme)
- Le **parrainage** et les **codes promo**
- La **livraison B2C**
- La **configuration système** et les **rôles admin**

**Backend :** API Express.js séparée sur `d:/for-you-platform` — **ne pas modifier depuis ce repo.**

**Frontend :** Next.js App Router sur `c:/Users/gilex/Downloads/foryouboard/foryouboard`.

---

## 2. Stack technique

| Technologie | Usage |
|---|---|
| **Next.js 14** (App Router) | Framework — Server Components + Server Actions |
| **React 18** | UI components |
| **TypeScript 5** (strict) | Typage complet |
| **TailwindCSS v4** | Styles via variables CSS custom (`var(--primary)`, etc.) |
| **Lucide React** | Icônes |

### Particularités importantes

- **Server Components par défaut** — les pages (`page.tsx`) sont des composants serveur. Ils font les appels API directement, sans `useEffect`.
- **Client Components** (`"use client"`) — uniquement pour l'interactivité (état local, transitions, formulaires).
- **Server Actions** (`"use server"`) — fonctions appelées depuis le client qui s'exécutent côté serveur (mutations : créer, modifier, supprimer).
- **Pas de Redux, pas de React Query** — les données sont chargées par les Server Components et revalidées via `revalidatePath()`.

---

## 3. Architecture du projet

```
src/
├── app/                          # Routes Next.js App Router
│   ├── (auth)/                   # Pages non protégées (login)
│   └── (dashboard)/              # Pages protégées (dashboard complet)
│       ├── page.tsx              # Tableau de bord
│       ├── 403/page.tsx          # Page accès refusé
│       ├── vtc/                  # Module VTC
│       ├── contracts/            # Module contrats
│       ├── wallet/               # Module finance
│       ├── referrals/            # Module parrainage
│       ├── promo-codes/          # Module codes promo
│       ├── notifications/        # Module notifications
│       ├── delivery-b2b/         # Module livraison B2C (héritage nommage)
│       └── settings/             # Module paramètres système
│
├── features/                     # Logique métier par domaine
│   ├── auth/                     # Auth & permissions
│   ├── contracts/                # Contrats location-vente
│   ├── dashboard/                # Tableau de bord
│   ├── delivery-b2c/             # Livraison B2C
│   ├── documents/                # Documents KYC
│   ├── driver-bonus/             # Bonus drivers par paliers
│   ├── drivers/                  # Profils drivers
│   ├── passengers/               # Profils passagers
│   ├── promo-codes/              # Codes promotionnels
│   ├── rbac/                     # Rôles & permissions
│   ├── referrals/                # Programme parrainage
│   ├── rides/                    # Courses VTC
│   ├── settings/                 # Config système & admins
│   ├── vehicles/                 # Véhicules
│   ├── vtc-pricing/              # Tarification VTC
│   └── wallet/                   # Wallets & transactions
│
└── shared/                       # Code partagé
    ├── config/
    │   ├── api-routes.ts         # TOUTES les URLs backend (source unique)
    │   └── navigation.ts         # Structure de la sidebar
    ├── lib/
    │   ├── api/server.ts         # Fonction apiFetch() côté serveur
    │   └── format.ts             # Formatage dates, devises, etc.
    └── ui/                       # Composants UI réutilisables
        ├── can-view.tsx          # Guard permission client
        ├── layout/               # Shell, sidebar, header
        └── ...                   # Badge, Button, Modal, Input, etc.
```

### Structure type d'une feature

Chaque feature suit le même pattern à 3 couches :

```
features/drivers/
├── domain/
│   └── admin-driver.ts       # Types TypeScript (interfaces, pas de logique)
├── application/
│   ├── api.ts                # Fonctions de lecture (Server Components)
│   └── actions.ts            # Server Actions (mutations)
└── presentation/
    └── *.tsx                 # Composants React
```

---

## 4. Authentification & Système RBAC

### Connexion

La connexion se fait via `POST /api/admin/login` avec téléphone + mot de passe.  
En cas de succès, deux cookies sont créés (durée 8h) :
- `fyb_token` — JWT de session
- `fyb_admin` — profil admin en JSON (id, nom, rôle, permissions)

Tous les appels API backend incluent automatiquement ce token via la fonction `apiFetch()`.

### Rôles système

| Rôle | Description |
|---|---|
| `SUPER_ADMIN` | Accès total — bypass toutes les permissions |
| `FINANCE_ADMIN` | Gestion finance, wallets, contrats |
| `OPS_ADMIN` | Opérations (drivers, courses, véhicules) |
| `SUPPORT_ADMIN` | Support client (lectures, interventions limitées) |

Des rôles personnalisés peuvent être créés depuis Paramètres → Rôles & permissions.

### Comment fonctionne le RBAC

Le système a deux niveaux de protection :

#### 1. Niveau serveur (page.tsx)

Chaque page protégée appelle `requirePermission()` ou `requireAnyPermission()` au début de la fonction. Si l'admin n'a pas la permission, il est redirigé vers `/403`.

```typescript
// Exemple dans vtc/drivers/page.tsx
export default async function VtcDriversPage() {
  await requirePermission("driver.view_all");  // ← redirige vers /403 si absent
  // ... chargement des données
}
```

#### 2. Niveau client (composants)

Le composant `<CanView>` masque des éléments selon les permissions :

```tsx
// Bouton visible uniquement si l'admin a la permission driver.approve
<CanView permission="driver.approve">
  <Button onClick={handleApprove}>Approuver</Button>
</CanView>

// Avec plusieurs permissions (logique OR)
<CanView anyOf={["vehicle.manage", "vehicle.verify"]}>
  <ActionMenu />
</CanView>
```

Le hook `usePermissions()` permet d'accéder aux permissions dans la logique JS :

```typescript
const { can, canAny, isSuperAdmin } = usePermissions();
if (can("driver.suspend")) { /* afficher l'option */ }
```

#### 3. Navigation sidebar

Le sidebar filtre automatiquement ses liens selon les permissions. Si toutes les entrées d'une section sont cachées, le titre de la section disparaît aussi.

### Codes de permissions

| Permission | Accès accordé |
|---|---|
| `driver.view_all` | Voir la liste et les détails des drivers |
| `driver.approve` | Approuver un driver en attente |
| `driver.suspend` | Suspendre un driver actif |
| `driver.reactivate` | Réactiver un driver suspendu |
| `ride.view_all` | Voir toutes les courses |
| `ride.update_status` | Forcer un changement de statut de course |
| `passenger.view_all` | Voir les profils passagers |
| `vehicle.view_all` | Voir les véhicules |
| `vehicle.manage` | Créer, modifier, assigner des véhicules |
| `vehicle.verify` | Vérifier/rejeter des véhicules |
| `contract.view_all` | Voir les contrats location-vente |
| `wallet.view_all` | Voir wallets, transactions, retraits |
| `wallet.credit` | Créditer un wallet manuellement |
| `wallet.debit` | Débiter un wallet manuellement |
| `wallet.withdrawal.manage` | Gérer les demandes de retrait |
| `transaction.view_all` | Voir les transactions |
| `pricing.grid.configure` | Configurer la tarification VTC |
| `promo_code.view_all` | Voir les codes promo |
| `promo_code.manage` | Créer et désactiver des codes promo |
| `referral.view_all` | Voir les parrainages |
| `referral.config.view` | Voir la config parrainage |
| `referral.config.manage` | Modifier la config parrainage |
| `notification.send` | Envoyer des notifications push |
| `driver_bonus.config.view` | Voir les barèmes bonus |
| `driver_bonus.config.manage` | Gérer les barèmes bonus |
| `driver_bonus.awards.view` | Voir l'historique des awards |
| `delivery_b2c.view_all` | Voir les livraisons B2C |
| `delivery_b2c.manage` | Gérer les livraisons B2C |
| `document.verify` | Vérifier/rejeter des documents KYC |
| `admin.view_all` | Voir la liste des admins |
| `admin.create` | Créer un nouveau compte admin |
| `admin.update_role` | Changer le rôle d'un admin |
| `admin.grant_permission` | Octroyer une permission individuelle |
| `admin.deactivate` | Désactiver un compte admin |
| `admin.reactivate` | Réactiver un compte admin |
| `app_config.manage` | Modifier la configuration système |
| `role.create` | Créer un nouveau rôle |
| `role.update` | Modifier les permissions d'un rôle |
| `permission.create` | Créer une nouvelle permission |

---

## 5. Modules & Fonctionnalités

### 5.1 Tableau de bord (`/`)

**Permission requise :** Aucune (tout admin connecté y a accès)

**Ce qu'il affiche :** KPIs en temps réel — nombre de courses actives, drivers en ligne, revenus du jour, wallets plateforme.

**Données :** `getDashboardSnapshot()` → agrège plusieurs endpoints backend.

---

### 5.2 VTC — Drivers (`/vtc/drivers`)

**Permission requise :** `driver.view_all`

**Onglets disponibles :**

| Onglet | Contenu |
|---|---|
| **Approuvés (live)** | Tous les drivers approuvés avec statut online |
| **Véhicules plateforme** | Drivers approuvés avec un véhicule ForYou (`isVehicleOwner = false`) |
| **Véhicules personnels** | Drivers approuvés avec leur propre véhicule (`isVehicleOwner = true`) |
| **En ligne** | Drivers actuellement connectés avec position GPS |
| **En attente (live)** | Drivers en cours de validation KYC |

**Process de validation d'un driver :**
1. Le driver soumet ses infos et documents depuis l'app mobile
2. Il apparaît dans l'onglet **En attente**
3. L'admin vérifie les documents (onglet Documents dans le détail driver)
4. L'admin clique **Approuver** → `PATCH /api/admin/drivers/{id}/approve`
5. Le driver peut désormais recevoir des courses

**Actions disponibles sur un driver :**
- `driver.approve` → Approuver (passe de PENDING à ACTIVE)
- `driver.suspend` → Suspendre (ACTIVE → SUSPENDED)
- `driver.reactivate` → Réactiver (SUSPENDED → ACTIVE)

**Détail driver (`/vtc/drivers/[driverId]`) :** Affiche le profil complet, les véhicules, le wallet EARNINGS, l'historique des courses, les sessions de connexion et les documents KYC.

---

### 5.3 VTC — Courses (`/vtc/rides`)

**Permission requise :** `ride.view_all`

**Ce qu'il affiche :** Liste de toutes les courses avec filtres (statut, type de véhicule, période).

**Statuts d'une course :**
`REQUESTED` → `MATCHED` → `ACCEPTED` → `ARRIVED` → `IN_PROGRESS` → `COMPLETED`  
(ou `CANCELLED` depuis n'importe quel état)

**Action admin :** L'admin peut forcer un changement de statut via `PATCH /api/admin/rides/{id}/status` (permission `ride.update_status`).

**Détail course (`/vtc/rides/[rideId]`) :** Affiche driver, passager, véhicule, tracé GPS, tarification détaillée et transactions associées.

---

### 5.4 VTC — Véhicules (`/vtc/vehicles`)

**Permission requise :** `vehicle.view_all`

**Types de véhicules :**
- **Véhicule plateforme** (`isVehicleOwner = false`) — appartient à ForYou, assigné à un driver
- **Véhicule personnel** (`isVehicleOwner = true`) — appartient au driver lui-même

**Cycle de vie d'un véhicule plateforme :**
1. Création par un admin → `POST /api/vehicles/admin/add`
2. Vérification des documents → `POST /api/vehicles/admin/{id}/verify`
3. Assignation à un driver → `POST /api/vehicles/admin/{id}/assign`
4. Si besoin : maintenance → `POST /api/vehicles/admin/{id}/maintenance/start`
5. Fin de contrat : retraite → `POST /api/vehicles/admin/{id}/retire`

**Actions disponibles (`vehicle.manage`) :** Créer, modifier, assigner, désassigner, démarrer/terminer maintenance, retirer.  
**Actions disponibles (`vehicle.verify`) :** Vérifier ou rejeter un véhicule.

---

### 5.5 VTC — Tarification (`/vtc/pricing`)

**Permission requise :** `pricing.grid.configure`

**Trois composantes de la tarification :**

#### Profils de prix
Définissent la structure tarifaire par type de service et de véhicule :
- Prix de base, prix par km, prix par minute
- Frais de réservation, tarif minimum
- Multiplicateurs surge (rush hour, nuit, weekend)

Un seul profil peut être **actif** par combinaison `serviceKey + vehicleType`. Pour changer le profil actif, il faut d'abord désactiver l'actuel.

#### Règles surge (majoration dynamique)
Définissent des multiplicateurs automatiques selon des créneaux horaires ou des conditions :
- Heure de pointe (7h-9h, 17h-19h)
- Nuit (22h-6h)
- Weekend

#### Zones tarifaires
Découpage géographique pour appliquer des tarifs différenciés selon la zone (centre-ville, aéroport, banlieue).

---

### 5.6 VTC — Bonus Drivers (`/vtc/driver-bonus`)

**Permission requise :** `driver_bonus.config.view` OU `driver_bonus.awards.view`

**Concept :** Système de bonus par paliers. Quand un driver atteint un nombre de courses défini, il reçoit automatiquement un bonus en XOF crédité sur son wallet EARNINGS.

**Exemple de barème :**
- 50 courses → 5 000 XOF
- 100 courses → 12 000 XOF
- 200 courses → 25 000 XOF

**Onglets :**
- **Barèmes** — configuration des paliers (création, activation, désactivation)
- **Historique** — tous les awards versés, filtrables par driver, catégorie, période

**Note :** Un seul barème peut être actif par catégorie de véhicule.

---

### 5.7 Contrats location-vente (`/contracts`)

**Permission requise :** `contract.view_all`

**Concept :** ForYou confie un véhicule à un driver. Le driver rembourse le prix d'achat (+ marge) via des prélèvements automatiques sur ses gains (wallet EARNINGS), selon une fréquence choisie.

**Calcul du contrat :**
```
montantTotal = round(purchasePrice × (1 + marginPct / 100))
montantEchéance = round(montantTotal / nbEchéances)
(la dernière échéance absorbe le résidu d'arrondi)
```

**Fréquences disponibles :**
- `JOURNALIER` → `dureeMois × 30` échéances
- `HEBDOMADAIRE` → `dureeMois × 4` échéances
- `MENSUEL` → `dureeMois` échéances

**Statuts d'un contrat :**

| Statut | Description |
|---|---|
| `ACTIF` | En cours de remboursement |
| `SUSPENDU` | Temporairement gelé (driver bloqué pour impayés) |
| `ROMPU` | Résilié avant terme |
| `TERMINÉ` | Entièrement remboursé |
| `SOLDÉ` | Soldé manuellement |

**Processus de création d'un contrat :**
1. Sélectionner un driver approuvé
2. Sélectionner un véhicule plateforme disponible
3. Définir : prix d'achat, marge (%), durée (mois), fréquence
4. Le système calcule et génère l'échéancier complet

**Actions disponibles :**
- **Paiement manuel** — enregistrer une échéance payée hors plateforme
- **Suspendre** — geler temporairement le contrat
- **Reprendre** — réactiver un contrat suspendu
- **Débloquer driver** — lever le blocage d'un driver suspendu pour impayés
- **Rompre** — résilier définitivement avec motif

**Audit log :** Chaque action sur un contrat génère une entrée dans le journal d'audit (visible dans le détail du contrat).

---

### 5.8 Wallet & Transactions (`/wallet`)

**Permission requise :** `wallet.view_all`

**4 types de wallets :**

| Type | Propriétaire | Usage |
|---|---|---|
| `PAYMENT` | Passager | Payer les courses |
| `EARNINGS` | Driver | Recevoir les gains, rembourser les contrats |
| `PARTNER` | Partenaire B2B | Transactions partenaires |
| `PLATFORM` | ForYou | Revenus de la plateforme |

**3 sous-balances par wallet :**

| Sous-balance | Description |
|---|---|
| `MAIN` | Balance principale (argent réel) |
| `BONUS` | Bonus promotionnels (déduits en premier) |
| `REFERRAL` | Gains de parrainage (déduits en deuxième) |

**Ordre de déduction lors d'un paiement :** BONUS → REFERRAL → MAIN

**Onglets disponibles :**
- **Wallets** — liste de tous les wallets avec balances
- **Transactions** — historique de toutes les transactions avec filtres
- **Retraits** — demandes de retrait des drivers
- **Revenue plateforme** — vue des revenus du wallet PLATFORM

**Actions (`wallet.credit` / `wallet.debit`) :** Un admin peut créditer ou débiter manuellement n'importe quelle sous-balance avec motif obligatoire.

---

### 5.9 Parrainage (`/referrals`)

**Permission requise :** `referral.view_all`

**Concept :** Un utilisateur parraine un ami. Quand l'ami effectue sa première course, le parrain reçoit un bonus sur son wallet.

**Onglets :**
- **Tous les parrainages** — liste complète avec statuts
- **Parrains** — utilisateurs qui ont parrainé quelqu'un
- **Filleuls** — nouveaux inscrits via parrainage
- **Configuration** (permission `referral.config.view`) — paramètres du programme

**Statuts d'un parrainage :** `PENDING` → `VALIDATED` ou `EXPIRED`

**Actions disponibles :**
- Valider manuellement un parrainage → `POST /api/admin/referrals/{id}/validate`
- Expirer manuellement → `POST /api/admin/referrals/{id}/expire`

**Configuration du programme (`referral.config.manage`) :**
- Montant du bonus parrain (XOF)
- Montant du bonus filleul (XOF)
- Délai d'expiration (jours)
- Conditions d'éligibilité

---

### 5.10 Codes promo (`/promo-codes`)

**Permission requise :** `promo_code.view_all`

**Actions disponibles (`promo_code.manage`) :**
- Créer un code avec montant, pourcentage ou gratuité, date d'expiration, usage max
- Activer / désactiver un code existant → `PATCH /api/admin/promo-codes/{id}/toggle`

---

### 5.11 Livraison B2C (`/delivery-b2b/shipments`)

**Permission requise :** `delivery_b2c.view_all`

**Ce qu'il affiche :** Liste des commandes de livraison B2C (passager → driver livreur), avec statut, destinataire, montant.

**Détail commande :** Informations colis, OTP de confirmation, photos de livraison, tracé.

> **Note :** Plusieurs sous-pages (Livreurs, Expéditeurs, Planning, Tarifs) sont actuellement en mode **mock** — l'interface est en place mais les données sont statiques, en attente d'intégration backend.

---

### 5.12 Paramètres système (`/settings`)

**Permission requise :** `admin.view_all` OU `app_config.manage`

**5 onglets :**

#### Admins
Liste de tous les comptes administrateurs avec leur rôle et statut.

**Actions disponibles :**
- **Créer un admin** (`admin.create`) — formulaire : prénom, nom, téléphone, mot de passe, rôle
- **Changer le rôle** (`admin.update_role`) — via dropdown sur chaque ligne
- **Octroyer une permission** (`admin.grant_permission`) — permission individuelle hors rôle
- **Désactiver** (`admin.deactivate`) — révoque l'accès sans supprimer le compte
- **Réactiver** (`admin.reactivate`) — restaure l'accès

#### Rôles & permissions
- **Rôles** — liste des rôles avec leurs permissions associées. Possibilité d'ajouter/retirer des permissions sur un rôle.
- **Permissions** — catalogue complet, groupé par module. Permet de créer de nouvelles permissions et de synchroniser les permissions manquantes.

#### Plateforme
- **Config versions mobiles** — versions minimales et dernières des apps iOS/Android (passager et driver)
- **Bonus de bienvenue driver** — montant et quota du bonus offert aux premiers drivers inscrits
- **Configuration système** — clés dynamiques (ex: `PAYMENT_TOLERANCE_DAYS`)

#### Webhooks & Audit log
> Actuellement en mock — interfaces statiques, intégration backend à venir.

---

## 6. Patterns de développement

### 6.1 Ajouter une nouvelle page

1. Créer `src/app/(dashboard)/ma-section/page.tsx`
2. Ajouter la garde de permission en premier :
   ```typescript
   export default async function MaPage() {
     await requirePermission("ma.permission");
     const data = await monApi();
     return <MonComposant data={data} />;
   }
   ```
3. Ajouter l'entrée dans `src/shared/config/navigation.ts` avec `requiredPermissions`
4. Créer la route API dans `src/shared/config/api-routes.ts`
5. Créer la fonction de lecture dans `features/mon-module/application/api.ts`

### 6.2 Ajouter une action (mutation)

Dans `features/mon-module/application/actions.ts` :

```typescript
"use server";

export async function monAction(id: string, input: MonInput): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.monModule.update(id), {
      method: "PATCH",
      body: input,
    });
    revalidatePath("/ma-section"); // invalide le cache Next.js
    return { ok: true, message: "Mis à jour." };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}
```

### 6.3 Protéger un bouton côté client

```tsx
import { CanView } from "@/shared/ui/can-view";

// Permission unique
<CanView permission="driver.suspend">
  <Button>Suspendre</Button>
</CanView>

// Une permission parmi plusieurs (OR)
<CanView anyOf={["vehicle.manage", "vehicle.verify"]}>
  <ActionMenu />
</CanView>

// Toutes les permissions (AND)
<CanView allOf={["contract.view_all", "wallet.view_all"]}>
  <FinanceSection />
</CanView>

// Avec fallback si pas autorisé
<CanView permission="admin.create" fallback={<p>Accès refusé</p>}>
  <CreateButton />
</CanView>
```

### 6.4 Utiliser les permissions dans la logique JS

```typescript
const { can, canAny, isSuperAdmin } = usePermissions();

const menuItems = [
  can("vehicle.manage") && { label: "Modifier", onClick: handleEdit },
  can("vehicle.verify") && { label: "Vérifier", onClick: handleVerify },
].filter(Boolean);
```

### 6.5 Appel API côté serveur

Toujours passer par `apiFetch()` depuis `@/shared/lib/api/server` :

```typescript
import { apiFetch } from "@/shared/lib/api/server";
import { API_ROUTES } from "@/shared/config/api-routes";

const result = await apiFetch<MonType>(API_ROUTES.monModule.list(), {
  query: { page: 1, limit: 20 },   // query params
});
```

### 6.6 Gestion des erreurs — `Promise.allSettled`

Les pages chargent plusieurs sources de données en parallèle. Si une source échoue, les autres continuent :

```typescript
const [driversRes, ridesRes] = await Promise.allSettled([
  listAdminDrivers(),
  listAdminRides(),
]);

const drivers = driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
const error = driversRes.status === "rejected" ? driversRes.reason.message : undefined;
```

---

## 7. Routes API Backend

Toutes les routes backend sont déclarées dans `src/shared/config/api-routes.ts`. **Ne jamais écrire une URL API directement dans le code** — toujours importer depuis ce fichier.

### Groupes principaux

| Groupe | Préfixe | Description |
|---|---|---|
| `admin` | `/api/admin/` | Auth, admins, rôles, permissions |
| `adminDrivers` | `/api/admin/drivers/` | Gestion drivers |
| `adminRides` | `/api/admin/rides/` | Gestion courses |
| `vehicles` | `/api/vehicles/admin/` | Gestion véhicules |
| `documents` | `/api/documents/admin/` | Documents KYC |
| `adminContracts` | `/api/admin/contracts/` | Contrats location-vente |
| `adminWallets` | `/api/admin/wallets/` | Wallets & transactions |
| `adminReferrals` | `/api/admin/referrals/` | Programme parrainage |
| `adminPromos` | `/api/admin/promo-codes/` | Codes promotionnels |
| `adminPricingProfiles` | `/api/admin/pricing/profiles/` | Profils tarifaires |
| `adminSurge` | `/api/admin/surge-rules/` | Règles surge |
| `adminDelivery` | `/api/admin/delivery/` | Livraison B2C |
| `adminDriverBonus` | `/api/admin/driver-bonus/` | Bonus drivers |
| `appConfig` | `/api/app-config/` | Config versions mobiles |
| `systemConfig` | `/api/app-config/config/` | Clés système dynamiques |

### Ce qui n'est pas encore exposé côté backend

| Fonctionnalité | Statut |
|---|---|
| Journal d'actions admin (audit log général) | ❌ Non implémenté |
| Webhooks | ❌ Non exposé |
| Livraison B2C — Livreurs, Expéditeurs, Planning | ❌ Non exposé |
| Livraison B2B (partenaires, tournées) | ❌ Non exposé |
| Notifications push (formulaire envoi) | ⚠️ Interface mock |
| `GET /api/admin/payments/intents` | ❌ Erreur 500 backend |

---

## 8. Navigation & Permissions

### Structure de la sidebar

```
Vue d'ensemble
└── Tableau de bord /

Opérations
├── VTC
│   ├── Courses /vtc/rides                    [ride.view_all]
│   ├── Drivers /vtc/drivers                  [driver.view_all]
│   ├── Passagers /vtc/passengers             [passenger.view_all]
│   └── Véhicules /vtc/vehicles              [vehicle.view_all]
└── Livraison B2C /delivery-b2b/             [delivery_b2c.view_all | delivery_b2c.manage]

Marketing
├── Codes promo /promo-codes                  [promo_code.view_all]
├── Parrainage /referrals                     [referral.view_all | referral.config.view]
├── Bonus drivers /vtc/driver-bonus           [driver_bonus.config.view | driver_bonus.awards.view]
└── Notifications /notifications              [notification.send]

Finance
├── Tarifs & surge /vtc/pricing               [pricing.grid.configure]
├── Contrats /contracts                       [contract.view_all]
└── Wallet & transactions /wallet             [wallet.view_all | transaction.view_all]

Système
└── Paramètres /settings                      [admin.view_all | app_config.manage]
```

**Règle :** Si un admin n'a aucune des permissions requises pour un lien, ce lien disparaît du sidebar. Si tous les liens d'une section disparaissent, le titre de section disparaît aussi.

---

## 9. Démarrage du projet

### Prérequis

- Node.js 18+
- Le backend ForYou doit tourner sur `http://localhost:3000`
- Variables d'environnement dans `.env.local`

### Installation

```bash
cd foryouboard
npm install
npm run dev     # Lance le front sur http://localhost:3001
```

### Variables d'environnement (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Connexion en développement

Se connecter avec un compte SUPER_ADMIN créé en backend. Le SUPER_ADMIN bypass toutes les vérifications de permissions.

### Créer un compte admin

Via l'API backend directement (seed), ou depuis l'interface une fois connecté :
`Paramètres → Admins → Nouvel admin`

### Branche de travail

La branche principale de développement est `feat/drivers`. Les merges vers `main` se font manuellement après validation.

---

*Document généré le 08/07/2026 — ForYouBoard v1.0*
