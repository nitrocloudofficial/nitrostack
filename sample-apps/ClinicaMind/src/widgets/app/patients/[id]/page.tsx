import React from 'react';
import { PatientProfileClient } from './PatientProfileClient';

export const dynamic = 'force-dynamic';

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  return <PatientProfileClient id={params.id} />;
}
