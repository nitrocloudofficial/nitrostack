import { expect, test, describe, beforeEach } from 'vitest';
import { StateManager } from '../orchestrator/state-manager.js';
import { Factory } from '../core/types.js';

describe('StateManager', () => {
  beforeEach(() => {
    StateManager.getInstance().resetState();
  });

  test('getInstance returns a singleton', () => {
    const instance1 = StateManager.getInstance();
    const instance2 = StateManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('addFactory adds to state and recalculates', () => {
    const manager = StateManager.getInstance();
    const initialCount = manager.getFactories().length;
    
    const mockFactory: Factory = {
      id: 'test_fact_01',
      name: 'Test Factory',
      industryType: 'Manufacturing',
      location: { lat: 10, lng: 10, address: 'Test Address' },
      productionCapacity: '1000',
      rawMaterials: [],
      declaredWastes: [],
      complianceStatus: 'filed',
      savingsEarned: 0,
      co2Avoided: 0
    };
    
    manager.addFactory(mockFactory);
    const newCount = manager.getFactories().length;
    expect(newCount).toBe(initialCount + 1);
    
    const retrieved = manager.getFactory('test_fact_01');
    expect(retrieved?.name).toBe('Test Factory');
  });

  test('fallback behavior works without throwing errors when Supabase is missing', async () => {
    const manager = StateManager.getInstance();
    const mockFactory: Factory = {
      id: 'test_fact_02',
      name: 'Test Factory 2',
      industryType: 'Manufacturing',
      location: { lat: 10, lng: 10, address: 'Test Address' },
      productionCapacity: '1000',
      rawMaterials: [],
      declaredWastes: [],
      complianceStatus: 'filed',
      savingsEarned: 0,
      co2Avoided: 0
    };
    
    // This should resolve gracefully even if DB connection fails
    await expect(manager.persistFactory(mockFactory)).resolves.not.toThrow();
  });
});
