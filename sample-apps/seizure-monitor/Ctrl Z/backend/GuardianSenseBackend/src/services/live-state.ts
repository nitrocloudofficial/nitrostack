export interface LiveVitals {
    respiration:number;
    motion:string;
    confidence:number;
    risk:string;
    csi:number[];
}

let latestVitals: LiveVitals = {
  respiration:0,
  motion:"Waiting...",
  confidence:0,
  risk:"Unknown",
  csi: [],
};

// NEW: Store the last 30 respiration values
let respirationHistory: {
  time: number;
  respiration: number;
}[] = [];

export function updateLiveVitals(vitals: LiveVitals) {
  latestVitals = vitals;

  respirationHistory.push({
    time: Date.now(),
    respiration: vitals.respiration,
  });

  if (respirationHistory.length > 30) {
    respirationHistory.shift();
  }
}

export function getLiveVitals() {
  return latestVitals;
}

// NEW
export function getRespirationHistory() {
  return respirationHistory;
}