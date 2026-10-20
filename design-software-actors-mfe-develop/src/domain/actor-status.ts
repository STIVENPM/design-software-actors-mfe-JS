/**
 * domain/actor-status — tipos de la máquina de estados parametrizable (HU actores).
 *
 * Fuente: `actors_parameterization.status[_category|_transition]` (data-model de
 * actors-service) + pantalla `paramActorStatus` del mockup v2. Sin React, sin fetch.
 * Los contratos de catálogos son laxos (`additionalProperties: true`), así que
 * los lectores defensivos nunca rompen ante payloads parciales.
 */

export interface ActorStatusCategory {
  /** ID del catálogo: es lo que viaja en GET /catalogs/{catalog_id}/details (backend). */
  id: string
  code: string
  name: string
  description: string
  appliesTo: string
  isActive: boolean
}

export interface ActorStatus {
  categoryCode: string
  categoryName: string
  code: string
  name: string
  isInitial: boolean
  isTerminal: boolean
  displayOrder: number
  colorHex: string
  isActive: boolean
}

export interface ActorStatusTransition {
  categoryCode: string
  categoryName: string
  fromName: string
  toName: string
  requiredFeature: string | null
  isActive: boolean
}

export type ActorStatusTab = 'categories' | 'statuses' | 'transitions'

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** null cuando el objeto no sirve ni como categoría (sin código). */
export function toActorStatusCategory(input: unknown): ActorStatusCategory | null {
  if (typeof input !== 'object' || input === null) return null
  const record = input as Record<string, unknown>
  const code = readString(record.code).trim() || readString(record.id).trim()
  if (!code) return null
  return {
    id: readString(record.id).trim(),
    code,
    name: readString(record.name, code),
    description: readString(record.description),
    appliesTo: readString(record.applies_to_entity, readString(record.applies_to)),
    isActive: readBoolean(record.is_active, true),
  }
}

/** null cuando no hay código de estado. categoryName puede venir vacío. */
export function toActorStatus(input: unknown, categoryCode: string, categoryName: string): ActorStatus | null {
  if (typeof input !== 'object' || input === null) return null
  const record = input as Record<string, unknown>
  const code = readString(record.code).trim()
  if (!code) return null
  return {
    categoryCode,
    categoryName,
    code,
    name: readString(record.name, code),
    isInitial: readBoolean(record.is_initial),
    isTerminal: readBoolean(record.is_terminal),
    displayOrder: readNumber(record.display_order, 1),
    colorHex: readString(record.color_hex, '#6B7280'),
    isActive: readBoolean(record.is_active, true),
  }
}

/** null cuando falta origen o destino (transición inservible). */
export function toActorStatusTransition(
  input: unknown,
  categoryCode: string,
  categoryName: string,
): ActorStatusTransition | null {
  if (typeof input !== 'object' || input === null) return null
  const record = input as Record<string, unknown>
  const fromName = readString(record.from_status).trim()
  const toName = readString(record.to_status).trim()
  if (!fromName || !toName) return null
  const requiredFeature = readString(record.required_feature_code).trim()
  return {
    categoryCode,
    categoryName,
    fromName,
    toName,
    requiredFeature: requiredFeature || null,
    isActive: readBoolean(record.is_active, true),
  }
}
