import "server-only"

import type { Factory, WasteStream } from "@/lib/types"
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/server/supabase"

type FactoryRow = {
  id: string
  name: string
  industry_type: string
  lat: number
  lng: number
  address: string
  production_capacity: string | null
  raw_materials: string[] | null
  declared_wastes: string[] | null
  waste_streams: WasteStream[] | null
  compliance_status: Factory["complianceStatus"] | null
  last_filed_date: string | null
  savings_earned: number | null
  co2_avoided: number | null
}

function rowToFactory(row: FactoryRow): Factory {
  return {
    id: row.id,
    name: row.name,
    industryType: row.industry_type,
    location: {
      lat: row.lat,
      lng: row.lng,
      address: row.address,
    },
    productionCapacity: row.production_capacity ?? "",
    rawMaterials: row.raw_materials ?? [],
    declaredWastes: row.declared_wastes ?? [],
    wasteStreams: row.waste_streams ?? undefined,
    complianceStatus: row.compliance_status ?? "filed",
    lastFiledDate: row.last_filed_date ?? undefined,
    savingsEarned: row.savings_earned ?? 0,
    co2Avoided: row.co2_avoided ?? 0,
  }
}

function factoryToRow(factory: Factory): FactoryRow {
  return {
    id: factory.id,
    name: factory.name,
    industry_type: factory.industryType,
    lat: factory.location.lat,
    lng: factory.location.lng,
    address: factory.location.address,
    production_capacity: factory.productionCapacity,
    raw_materials: factory.rawMaterials,
    declared_wastes: factory.declaredWastes,
    waste_streams: factory.wasteStreams ?? null,
    compliance_status: factory.complianceStatus,
    last_filed_date: factory.lastFiledDate ?? null,
    savings_earned: factory.savingsEarned,
    co2_avoided: factory.co2Avoided,
  }
}

export function isDatabaseConfigured(): boolean {
  return isSupabaseConfigured() && getSupabaseServerClient() !== null
}

export async function loadFactoriesFromDatabase(): Promise<Factory[] | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("factories")
    .select("*")
    .order("id", { ascending: true })

  if (error) {
    throw new Error(`Failed to load factories from Supabase: ${error.message}`)
  }

  return ((data ?? []) as FactoryRow[]).map(rowToFactory)
}

export async function persistFactoryToDatabase(factory: Factory): Promise<void> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return

  const { error } = await supabase
    .from("factories")
    .upsert(factoryToRow(factory), { onConflict: "id" })

  if (error) {
    throw new Error(`Failed to persist factory to Supabase: ${error.message}`)
  }
}
