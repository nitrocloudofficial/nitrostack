import { Injectable } from '@nitrostack/core';
import { httpGetJson, HttpError } from '../../common/http.js';

const BASE_URL = process.env.IFSC_BASE_URL ?? 'https://ifsc.razorpay.com';

/** IFSC format: 4-letter bank code, a mandatory '0', then a 6-char branch code. */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Raw shape returned by the Razorpay IFSC API (keys are UPPER_CASE). */
interface IfscRaw {
    BANK: string;
    BANKCODE?: string;
    IFSC: string;
    BRANCH: string;
    ADDRESS: string;
    CITY: string;
    DISTRICT?: string;
    STATE: string;
    CENTRE?: string;
    CONTACT?: string;
    MICR?: string | null;
    SWIFT?: string | null;
    NEFT?: boolean;
    RTGS?: boolean;
    IMPS?: boolean;
    UPI?: boolean;
}

export interface BankBranch {
    ifsc: string;
    bank: string;
    bankCode?: string;
    branch: string;
    address: string;
    city: string;
    district?: string;
    state: string;
    centre?: string;
    contact?: string;
    micr?: string | null;
    swift?: string | null;
    supports: {
        neft: boolean;
        rtgs: boolean;
        imps: boolean;
        upi: boolean;
    };
    source: string;
    fetchedAt: string; // ISO timestamp of this verification
}

@Injectable()
export class BankService {
    /** Verify an IFSC code and return the bank/branch details (live Razorpay API). */
    async verifyIfsc(ifscInput: string): Promise<BankBranch> {
        const ifsc = ifscInput.trim().toUpperCase();

        if (!IFSC_REGEX.test(ifsc)) {
            throw new Error(
                `"${ifscInput}" is not a valid IFSC. Expected 11 characters: 4 letters + '0' + 6 alphanumerics (e.g. HDFC0001234).`,
            );
        }

        let raw: IfscRaw;
        try {
            raw = await httpGetJson<IfscRaw>(`${BASE_URL}/${ifsc}`);
        } catch (err) {
            if (err instanceof HttpError && err.status === 404) {
                throw new Error(`IFSC ${ifsc} was not found in the bank directory. Double-check the code.`);
            }
            throw err;
        }

        return {
            ifsc: raw.IFSC,
            bank: raw.BANK,
            bankCode: raw.BANKCODE,
            branch: raw.BRANCH,
            address: raw.ADDRESS,
            city: raw.CITY,
            district: raw.DISTRICT,
            state: raw.STATE,
            centre: raw.CENTRE,
            contact: raw.CONTACT,
            micr: raw.MICR ?? null,
            swift: raw.SWIFT ?? null,
            supports: {
                neft: Boolean(raw.NEFT),
                rtgs: Boolean(raw.RTGS),
                imps: Boolean(raw.IMPS),
                upi: Boolean(raw.UPI),
            },
            source: 'Razorpay IFSC',
            fetchedAt: new Date().toISOString(),
        };
    }
}
