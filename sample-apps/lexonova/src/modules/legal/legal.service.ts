import { Injectable } from '@nitrostack/core';
import { CONSTITUTION, LABOUR_CODES, PROCEDURES, type LawEntry, type ProcedureStep } from './legal.data.js';

@Injectable()
export class LegalService {
    /**
     * Get all law entries (Constitution and Labour Codes)
     */
    getAllLaws(): LawEntry[] {
        return [...CONSTITUTION, ...LABOUR_CODES];
    }

    /**
     * Search law entries by query string
     */
    searchLaw(query: string): LawEntry[] {
        const q = query.toLowerCase();
        const allLaws = this.getAllLaws();
        return allLaws.filter((entry) => {
            const haystack = [entry.title, entry.text, entry.summary, ...(entry.tags || [])]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q) || (entry.tags || []).some((tag) => tag.toLowerCase().includes(q));
        });
    }

    /**
     * Get filing procedures filtered by issue type or query
     */
    getProcedures(issueType?: string): ProcedureStep[] {
        if (!issueType) {
            return PROCEDURES;
        }
        const q = issueType.toLowerCase();
        const relevant = PROCEDURES.filter(
            (step) =>
                step.tags.some((tag) => tag.toLowerCase().includes(q)) ||
                step.title.toLowerCase().includes(q) ||
                step.summary.toLowerCase().includes(q)
        );
        return relevant.length > 0 ? relevant : PROCEDURES;
    }

    /**
     * Get applicable limitation period / filing deadline for an issue type
     */
    checkDeadline(issueType: string, incidentDate: string, state: string) {
        const q = issueType.toLowerCase();
        let days = 365; // default 1 year
        let explanation = "typically 365 days (1 year) under the Grievance Redressal Committee guidelines";

        if (q.includes("wage") || q.includes("salary") || q.includes("pay")) {
            days = 2;
            explanation = "typically 2 working days for payment of all outstanding dues upon termination under Section 4 of the Code on Wages";
        } else if (q.includes("gratuity")) {
            days = 30;
            explanation = "typically 30 days from the date it becomes payable under Section 38 of the Social Security Code";
        } else if (q.includes("notice") || q.includes("change")) {
            days = 21;
            explanation = "typically requires 21 days' written notice before changing conditions under Section 16 of the IR Code";
        } else if (q.includes("retrench")) {
            days = 90; // 3 months
            explanation = "typically requires 3 months' notice or pay in lieu of notice for establishments with 300+ workers under Section 18 of the IR Code";
        } else if (q.includes("maternity")) {
            days = 180; // ~6 months
            explanation = "typically 26 weeks of paid maternity leave for eligible women under Section 39 of the Social Security Code";
        }

        // Calculate if deadline is approaching or passed
        const dateObj = new Date(incidentDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - dateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const passed = diffDays > days;
        const approaching = !passed && (days - diffDays <= 7); // within 7 days

        return {
            limitationPeriod: explanation,
            daysLimit: days,
            daysElapsed: diffDays,
            isPassed: passed,
            isApproaching: approaching,
        };
    }

    /**
     * Get authority body based on issue type and state
     */
    findAuthority(issueType: string, state: string) {
        const q = issueType.toLowerCase();

        if (q.includes("harassment") || q.includes("posh") || q.includes("sex")) {
            return {
                body: "POSH Internal Committee (IC) / Local Committee (LC)",
                description: "Workplaces with 10 or more employees must constitute an Internal Committee to handle sexual harassment complaints. For smaller workplaces or cases against employers, complaints are filed with the District Officer's Local Committee.",
                contactInfo: "File a written complaint within 3 months of the incident to the IC presiding officer at your workplace, or the District Local Committee office."
            };
        }

        if (q.includes("union") || q.includes("dispute") || q.includes("strike") || q.includes("lockout")) {
            return {
                body: "Industrial Tribunal / Grievance Redressal Committee",
                description: "Handles collective bargaining disputes, standing orders certification, and industrial disputes under the Industrial Relations Code.",
                contactInfo: "Submit through your registered negotiating union or the internal Grievance Redressal Committee of your establishment."
            };
        }

        // Default to Labour Commissioner
        return {
            body: "Labour Commissioner / Controlling Authority",
            description: "The primary regulatory authority enforcing minimum wages, timely payment, and social security benefits.",
            contactInfo: `File online through the Shram Suvidha Portal or visit the local office of the Deputy Labour Commissioner in ${state}.`
        };
    }
}
