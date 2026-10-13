/**
 * Example: How to use PharmaGuardWidget with FDA tools
 * 
 * This demonstrates the complete flow:
 * 1. Call the three FDA tools (lookup_ndc, search_adverse_events, check_recall_status)
 * 2. Normalize their outputs into a unified payload
 * 3. Render the PharmaGuardWidget with the payload
 */

import React, { useState, useEffect } from 'react';
import { PharmaGuardWidget } from './PharmaGuardWidget.js';
import { normalizePharmaGuardData } from './normalizer.js';
import type { PharmaGuardPayload } from './types.js';

/**
 * Example component that fetches data and renders the widget
 */
export const PharmaGuardExample: React.FC<{ drugName: string }> = ({ drugName }) => {
  const [payload, setPayload] = useState<PharmaGuardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real app, these would be MCP tool calls
        // For now, we'll use mock data to demonstrate the structure

        const mockNdcOutput = {
          found: true,
          productNdc: '0069-0001-01',
          genericName: 'Aspirin',
          brandName: 'Bayer Aspirin',
          dosageForm: 'Tablet',
          manufacturer: 'Bayer AG',
        };

        const mockAdverseEventsOutput = {
          found: true,
          topReactions: [
            { reaction: 'Nausea', count: 1250 },
            { reaction: 'Headache', count: 980 },
            { reaction: 'Dizziness', count: 750 },
            { reaction: 'Gastrointestinal Bleeding', count: 420 },
            { reaction: 'Rash', count: 310 },
          ],
        };

        const mockRecallStatusOutput = {
          hasActiveRecalls: false,
          recallCount: 0,
          recalls: [],
        };

        // Normalize the outputs
        const normalizedPayload = normalizePharmaGuardData(
          mockNdcOutput,
          mockAdverseEventsOutput,
          mockRecallStatusOutput,
        );

        setPayload(normalizedPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [drugName]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!payload) {
    return <div>No data available</div>;
  }

  return <PharmaGuardWidget payload={payload} />;
};

export default PharmaGuardExample;
