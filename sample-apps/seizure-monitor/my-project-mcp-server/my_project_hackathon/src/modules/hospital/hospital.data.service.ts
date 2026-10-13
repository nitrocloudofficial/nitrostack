import { Injectable } from '@nitrostack/core';
import cghsRates from '../../data/cghs-rates.json' with { type: 'json' };

export interface CghsRateEntry {
  code: string;
  procedure: string;
  city: string;
  cghsRate: number;
  currency: string;
}

/**
 * Loads the CGHS rate list once and exposes lookup methods.
 * Nothing else in the module talks to the JSON file directly.
 */
@Injectable()
export class HospitalDataService {
  private rates: CghsRateEntry[] = cghsRates as CghsRateEntry[];

  getEstimate(procedureCode: string, city: string): CghsRateEntry | undefined {
    return this.rates.find(
      (r) => r.code === procedureCode && r.city.toLowerCase() === city.toLowerCase()
    );
  }

  listProceduresForCity(city: string): CghsRateEntry[] {
    return this.rates.filter((r) => r.city.toLowerCase() === city.toLowerCase());
  }
}
