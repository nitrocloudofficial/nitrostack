import { Injectable } from '@nitrostack/core';
import mockClaims from '../../data/mock-claims.json' with { type: 'json' };

export interface ClaimEntry {
  claimId: string;
  patientId: string;
  procedureCode: string;
  hospitalId: string;
  cashlessStatus: 'approved' | 'denied' | 'pending';
  denialReason?: string;
  approvedAmount: number | null;
  isNetworkHospital: boolean;
  policyNumber: string;
}

@Injectable()
export class InsurerDataService {
  private claims: ClaimEntry[] = mockClaims as ClaimEntry[];

  getClaimByPatient(patientId: string): ClaimEntry | undefined {
    return this.claims.find((c) => c.patientId === patientId);
  }

  getClaimById(claimId: string): ClaimEntry | undefined {
    return this.claims.find((c) => c.claimId === claimId);
  }

  isNetworkHospital(hospitalId: string): boolean {
    const claim = this.claims.find((c) => c.hospitalId === hospitalId);
    return claim?.isNetworkHospital ?? false;
  }
}
