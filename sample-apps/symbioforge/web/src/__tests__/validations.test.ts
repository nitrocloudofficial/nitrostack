import { factoryRegistrationSchema } from "../lib/validations"
import { expect, test, describe } from "vitest"

describe('Validations', () => {
  test('Valid payload should be accepted', () => {
    const validPayload = {
      name: "Test Factory",
      industryType: "Textiles",
      location: {
        lat: 12.34,
        lng: 56.78,
        address: "123 Industrial Area"
      },
      productionCapacity: "1000 tons/month",
      rawMaterials: ["Cotton"],
      declaredWastes: ["Cotton waste"]
    }
    
    const result1 = factoryRegistrationSchema.safeParse(validPayload)
    expect(result1.success).toBe(true)
  })

  test('Invalid payload should be rejected', () => {
    const invalidPayload = {
      name: "T", // Too short
      industryType: "Textiles",
      location: {
        lat: 120, // Invalid lat
        lng: 56.78,
        address: "" // Empty address
      },
      productionCapacity: "1000 tons/month",
      rawMaterials: [], // Empty array
      declaredWastes: ["Cotton waste"]
    }
    
    const result2 = factoryRegistrationSchema.safeParse(invalidPayload)
    expect(result2.success).toBe(false)
    if (!result2.success && result2.error) {
      const errors = result2.error.issues.map(e => e.path.join(".") + ": " + e.message)
      expect(errors).toContain("name: Name must be at least 2 characters")
      expect(errors).toContain("location.lat: Invalid latitude")
      expect(errors).toContain("location.address: Address is required")
      expect(errors).toContain("rawMaterials: At least one raw material is required")
    }
  })
})
