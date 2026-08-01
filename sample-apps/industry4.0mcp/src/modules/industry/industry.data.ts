// src/modules/industry/industry.data.ts

// Machine Data Structure
export interface Machine {
  machine_id: string;
  status: 'Running' | 'Idle' | 'Failed';
  temperature: number;
  vibration: number;
  tool_offset: number;
  coolant_pressure: number;
}

// Job Queue Structure
export interface Job {
  job_id: string;
  product_id: string;
  assigned_machine: string;
  status: 'Pending' | 'In Progress' | 'Delayed';
  energy_cost: number;
}

// Humara In-Memory Synthetic Database
export const PlantDatabase = {
  machines: [
    { machine_id: "CNC_1", status: "Running", temperature: 72.5, vibration: 4.1, tool_offset: 10.0, coolant_pressure: 5.0 },
    { machine_id: "CNC_2", status: "Idle", temperature: 25.0, vibration: 0.5, tool_offset: 12.0, coolant_pressure: 4.5 },
    { machine_id: "M1", status: "Running", temperature: 85.0, vibration: 8.5, tool_offset: 8.0, coolant_pressure: 6.0 } // Yeh machine kharab hone wali hai
  ] as Machine[],
  
  jobQueue: [
    { job_id: "J_99", product_id: "Part_X", assigned_machine: "CNC_1", status: "In Progress", energy_cost: 15.5 },
    { job_id: "J_100", product_id: "Part_Y", assigned_machine: "M1", status: "Pending", energy_cost: 12.0 }
  ] as Job[],

  // Helper function: Machine dhundhne ke liye
  getMachineById(id: string): Machine | undefined {
    return this.machines.find(m => m.machine_id === id);
  },

  // Helper function: Machine update karne ke liye (jaise offset change karna)
  updateMachine(id: string, updates: Partial<Machine>) {
    const machine = this.getMachineById(id);
    if (machine) {
      Object.assign(machine, updates);
    }
  }
};