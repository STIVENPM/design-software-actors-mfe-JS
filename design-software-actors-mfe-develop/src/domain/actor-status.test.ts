import { describe, expect, it } from 'vitest'
import { toActorStatus, toActorStatusCategory, toActorStatusTransition } from './actor-status'

describe('toActorStatusCategory', () => {
  it('mapea una categoría completa', () => {
    expect(toActorStatusCategory({
      id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor',
      description: 'Ciclo de vida.', applies_to_entity: 'INSTRUCTOR', is_active: true,
    })).toEqual({
      id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor',
      description: 'Ciclo de vida.', appliesTo: 'INSTRUCTOR', isActive: true,
    })
  })

  it('devuelve null sin código ni id, y el id viaja para el fan-out', () => {
    expect(toActorStatusCategory({ name: 'Sin código' })).toBeNull()
    expect(toActorStatusCategory(null)).toBeNull()
    expect(toActorStatusCategory('INSTRUCTOR_STATUS')).toBeNull()
    expect(toActorStatusCategory({ code: 'X' })).toMatchObject({ id: '', name: 'X', isActive: true })
    expect(toActorStatusCategory({ id: 'cat-9', code: 'X' })).toMatchObject({ id: 'cat-9' })
  })
})

describe('toActorStatus', () => {
  it('mapea un estado completo con contexto de categoría', () => {
    expect(toActorStatus({
      code: 'INSTR_ACTIVE', name: 'Activo', is_initial: true, is_terminal: false,
      display_order: 1, color_hex: '#16A34A', is_active: true,
    }, 'INSTRUCTOR_STATUS', 'Estado de instructor')).toEqual({
      categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor',
      code: 'INSTR_ACTIVE', name: 'Activo', isInitial: true, isTerminal: false,
      displayOrder: 1, colorHex: '#16A34A', isActive: true,
    })
  })

  it('devuelve null sin código y fija defectos sensatos', () => {
    expect(toActorStatus({ name: 'Sin código' }, 'C', 'Cat')).toBeNull()
    expect(toActorStatus({ code: 'X' }, 'C', 'Cat')).toMatchObject({
      isInitial: false, isTerminal: false, displayOrder: 1, colorHex: '#6B7280', isActive: true,
    })
  })
})

describe('toActorStatusTransition', () => {
  it('mapea una transición con permiso opcional', () => {
    expect(toActorStatusTransition({
      from_status: 'En formación', to_status: 'En etapa productiva',
      required_feature_code: 'PRODUCTIVE_STAGE_ASSIGN', is_active: true,
    }, 'LEARNER_STATUS', 'Estado de aprendiz')).toEqual({
      categoryCode: 'LEARNER_STATUS', categoryName: 'Estado de aprendiz',
      fromName: 'En formación', toName: 'En etapa productiva',
      requiredFeature: 'PRODUCTIVE_STAGE_ASSIGN', isActive: true,
    })
  })

  it('permiso ausente es null y sin origen/destino es null', () => {
    expect(toActorStatusTransition(
      { from_status: 'Activo', to_status: 'En comisión' }, 'C', 'Cat',
    )).toMatchObject({ requiredFeature: null })
    expect(toActorStatusTransition({ from_status: 'Activo' }, 'C', 'Cat')).toBeNull()
    expect(toActorStatusTransition(null, 'C', 'Cat')).toBeNull()
  })
})
