/**
 * Route Handler — état partagé des pilotes en attente masqués.
 *
 * GET  /api/pending-hidden        → { hiddenIds: string[] }
 * POST /api/pending-hidden        → body: { hiddenIds: string[] } → { ok: true }
 *
 * Les IDs sont persistés dans .data/pending-hidden.json sur le serveur Next.js,
 * ce qui les rend partagés entre tous les admins (contrairement au localStorage).
 */

import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "pending-hidden.json");

async function readIds(): Promise<string[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeIds(ids: string[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(ids), "utf-8");
}

export async function GET() {
  const hiddenIds = await readIds();
  return NextResponse.json({ hiddenIds });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { hiddenIds?: string[] };
    const ids = Array.isArray(body.hiddenIds) ? body.hiddenIds : [];
    await writeIds(ids);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
