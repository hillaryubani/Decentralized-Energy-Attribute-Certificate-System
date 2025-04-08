import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const state = {
    generators: new Map(),
    generatorIdCounter: 0,
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Example admin address
  };
  
  const tx = {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Default sender is admin
  };
  
  const blockHeight = 100;
  
  return {
    state,
    tx,
    blockHeight,
    setSender: (sender) => {
      tx.sender = sender;
    }
  };
};

// Simplified contract functions
const contractFunctions = (env) => {
  return {
    registerGenerator: (generatorType, location, capacity) => {
      const newId = env.state.generatorIdCounter + 1;
      env.state.generatorIdCounter = newId;
      
      env.state.generators.set(newId, {
        owner: env.tx.sender,
        generatorType,
        location,
        capacity,
        status: 0, // PENDING
        verificationDate: 0
      });
      
      return { result: 'ok', value: newId };
    },
    
    verifyGenerator: (generatorId) => {
      if (env.tx.sender !== env.state.admin) {
        return { result: 'err', value: 403 };
      }
      
      if (!env.state.generators.has(generatorId)) {
        return { result: 'err', value: 404 };
      }
      
      const generator = env.state.generators.get(generatorId);
      generator.status = 1; // VERIFIED
      generator.verificationDate = env.blockHeight;
      env.state.generators.set(generatorId, generator);
      
      return { result: 'ok', value: true };
    },
    
    getGenerator: (generatorId) => {
      return env.state.generators.get(generatorId);
    },
    
    isGeneratorVerified: (generatorId) => {
      const generator = env.state.generators.get(generatorId);
      return generator ? generator.status === 1 : false;
    }
  };
};

describe('Generator Verification Contract', () => {
  let env;
  let contract;
  
  beforeEach(() => {
    env = mockContractEnv();
    contract = contractFunctions(env);
  });
  
  it('should register a new generator', () => {
    const result = contract.registerGenerator(1, 'New York', 1000);
    expect(result.result).toBe('ok');
    expect(result.value).toBe(1);
    
    const generator = contract.getGenerator(1);
    expect(generator).toBeDefined();
    expect(generator.owner).toBe(env.tx.sender);
    expect(generator.generatorType).toBe(1);
    expect(generator.location).toBe('New York');
    expect(generator.capacity).toBe(1000);
    expect(generator.status).toBe(0); // PENDING
  });
  
  it('should verify a generator when admin', () => {
    // Register a generator first
    contract.registerGenerator(1, 'New York', 1000);
    
    // Verify the generator
    const result = contract.verifyGenerator(1);
    expect(result.result).toBe('ok');
    
    // Check if generator is verified
    const generator = contract.getGenerator(1);
    expect(generator.status).toBe(1); // VERIFIED
    expect(generator.verificationDate).toBe(env.blockHeight);
    
    // Check isGeneratorVerified function
    expect(contract.isGeneratorVerified(1)).toBe(true);
  });
  
  it('should not allow non-admin to verify a generator', () => {
    // Register a generator first
    contract.registerGenerator(1, 'New York', 1000);
    
    // Change sender to non-admin
    env.setSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    
    // Try to verify the generator
    const result = contract.verifyGenerator(1);
    expect(result.result).toBe('err');
    expect(result.value).toBe(403);
    
    // Check if generator is still pending
    const generator = contract.getGenerator(1);
    expect(generator.status).toBe(0); // PENDING
  });
  
  it('should return error when verifying non-existent generator', () => {
    const result = contract.verifyGenerator(999);
    expect(result.result).toBe('err');
    expect(result.value).toBe(404);
  });
});
