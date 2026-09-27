import { Injectable } from '@nitrostack/core';

@Injectable()
export class WardCopilotService {
    private get baseUrl(): string {
        return process.env.BACKEND_URL || 'http://localhost:8000';
    }

    /**
     * Fetch patient summary from FastAPI backend
     */
    async getPatientSummary(patientId: string): Promise<any> {
        const url = `${this.baseUrl}/api/patient/${patientId}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch patient summary for ${patientId}: ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Fetch vitals trend telemetry from FastAPI backend
     */
    async getVitalsTrend(patientId: string): Promise<any> {
        const url = `${this.baseUrl}/api/vitals/${patientId}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch vitals trend for ${patientId}: ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Fetch XGBoost risk factors & SHAP drivers from FastAPI backend
     */
    async getRiskFactors(patientId: string): Promise<any> {
        const url = `${this.baseUrl}/api/risk/${patientId}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch risk factors for ${patientId}: ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Fetch FAISS clinically similar cohort cases from FastAPI backend
     */
    async findSimilarCases(patientId: string): Promise<any> {
        const url = `${this.baseUrl}/api/similar/${patientId}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch similar cases for ${patientId}: ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Request clinical factor explanation from FastAPI backend
     */
    async explainFactor(patientId: string, factor: string): Promise<any> {
        const url = `${this.baseUrl}/api/explain`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patientId, factor })
        });
        if (!response.ok) {
            throw new Error(`Failed to explain factor for ${patientId}: ${response.statusText}`);
        }
        return await response.json();
    }
}
