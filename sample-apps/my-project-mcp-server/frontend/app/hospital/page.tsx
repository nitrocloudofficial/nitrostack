import { fetchReconcileCase } from '@/lib/actions';
import { ReconciliationSummary } from '@/components/ReconciliationSummary';
import { HospitalView } from '@/components/HospitalView';

export const dynamic = 'force-dynamic';

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: {
    patientId?: string;
    procedureCode?: string;
    city?: string;
    hospitalBilledAmount?: string;
  };
}) {
  const patientId = searchParams.patientId || 'PAT-01';
  const procedureCode = searchParams.procedureCode || 'CGHS-CARD-001';
  const city = searchParams.city || 'Chennai';
  const hospitalBilledAmount = Number(searchParams.hospitalBilledAmount) || 65000;

  const { data, error } = await fetchReconcileCase({
    patientId,
    procedureCode,
    city,
    hospitalBilledAmount,
  });

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <p className="font-bold text-lg">Unable to reconcile case</p>
          <p className="mt-1 text-sm">{error || 'Unknown error occurred while connecting to MCP server.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ReconciliationSummary data={data} roleLabel="Hospital Portal" />
      <HospitalView data={data} />
    </div>
  );
}
