import { describe, expect, it } from 'vitest'
import { isValidToolName, RESERVED_TOOL_NAMES, toolNameError } from '../src/shared/names.ts'

describe('tool names', () => {
  it('accepts snake_case names', () => {
    expect(isValidToolName('weather_lookup')).toBe(true)
    expect(isValidToolName('a')).toBe(true)
    expect(isValidToolName('a2_b3')).toBe(true)
  })

  it('rejects uppercase, leading digits, dashes, and empty names', () => {
    expect(isValidToolName('Weather')).toBe(false)
    expect(isValidToolName('2fast')).toBe(false)
    expect(isValidToolName('a-b')).toBe(false)
    expect(isValidToolName('')).toBe(false)
  })

  it('rejects reserved management names', () => {
    for (const name of RESERVED_TOOL_NAMES) {
      expect(toolNameError(name)).toMatch(/reserved/)
    }
    expect(toolNameError('weather_lookup')).toBeNull()
  })
})
