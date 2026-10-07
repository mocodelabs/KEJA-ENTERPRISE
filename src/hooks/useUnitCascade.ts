'use client'

import { useMemo, useState } from 'react'

export type CascadeUnit = {
  id: string
  property_id: string
  property: { name: string } | null
  block_id: string | null
  floor: number | null
  block: { name: string } | null
}

export const NO_BLOCK = '__none__'
export const NO_FLOOR = '__none__'

/**
 * Drives a Property → Block → Floor → Unit cascade of dropdowns. Block/floor
 * selects only appear when the property's units actually carry that data, so
 * properties without blocks fall back to a plain Property → Unit picker.
 */
export function useUnitCascade<T extends CascadeUnit>(units: T[]) {
  const [propertyId, setPropertyIdRaw] = useState('')
  const [blockKey, setBlockKeyRaw] = useState('')
  const [floorKey, setFloorKeyRaw] = useState('')
  const [unitId, setUnitId] = useState('')

  function reset() {
    setPropertyIdRaw('')
    setBlockKeyRaw('')
    setFloorKeyRaw('')
    setUnitId('')
  }

  function setPropertyId(id: string) {
    setPropertyIdRaw(id)
    setBlockKeyRaw('')
    setFloorKeyRaw('')
    setUnitId('')
  }

  function setBlockKey(key: string) {
    setBlockKeyRaw(key)
    setFloorKeyRaw('')
    setUnitId('')
  }

  function setFloorKey(key: string) {
    setFloorKeyRaw(key)
    setUnitId('')
  }

  const properties = useMemo(() => {
    const seen = new Map<string, string>()
    for (const u of units) {
      if (u.property?.name && !seen.has(u.property_id)) seen.set(u.property_id, u.property.name)
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [units])

  const unitsForProperty = useMemo(() => units.filter((u) => u.property_id === propertyId), [units, propertyId])

  const blocksForProperty = useMemo(() => {
    const seen = new Map<string, string>()
    for (const u of unitsForProperty) {
      if (u.block_id && u.block?.name && !seen.has(u.block_id)) seen.set(u.block_id, u.block.name)
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [unitsForProperty])
  const hasUnassignedUnits = unitsForProperty.some((u) => !u.block_id)
  const showBlockSelect = blocksForProperty.length > 0

  const unitsForBlock = useMemo(() => {
    if (!showBlockSelect) return unitsForProperty
    if (blockKey === NO_BLOCK) return unitsForProperty.filter((u) => !u.block_id)
    return unitsForProperty.filter((u) => u.block_id === blockKey)
  }, [unitsForProperty, showBlockSelect, blockKey])

  const floorsForBlock = useMemo(() => {
    const seen = new Set<number>()
    for (const u of unitsForBlock) if (u.floor != null) seen.add(u.floor)
    return Array.from(seen).sort((a, b) => a - b)
  }, [unitsForBlock])
  const hasNoFloorUnits = unitsForBlock.some((u) => u.floor == null)
  const showFloorSelect = (!showBlockSelect || blockKey !== '') && floorsForBlock.length > 0

  const unitsForFloor = useMemo(() => {
    if (!showFloorSelect) return unitsForBlock
    if (floorKey === NO_FLOOR) return unitsForBlock.filter((u) => u.floor == null)
    return unitsForBlock.filter((u) => String(u.floor) === floorKey)
  }, [unitsForBlock, showFloorSelect, floorKey])

  const unitsToPickFrom =
    (showBlockSelect && blockKey === '') || (showFloorSelect && floorKey === '') ? [] : unitsForFloor

  return {
    propertyId,
    blockKey,
    floorKey,
    unitId,
    setPropertyId,
    setBlockKey,
    setFloorKey,
    setUnitId,
    reset,
    properties,
    blocksForProperty,
    floorsForBlock,
    showBlockSelect,
    showFloorSelect,
    hasUnassignedUnits,
    hasNoFloorUnits,
    unitsToPickFrom,
  }
}
