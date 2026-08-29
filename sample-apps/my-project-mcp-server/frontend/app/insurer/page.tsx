import { fetchReconcileCase } from '@/lib/actions';
import { ReconciliationSummary } from '@/components/ReconciliationSummary';
import { InsurerView } from '@/components/InsurerView';

export const dynamic = 'force-dynamic';

export default async function InsurerPage({
  searchParams,
}: {
  searchParams: {
    patientId?: string;
    procedureCode?: string;
    city?: string;
    hospitalBilledAmount?: string;
  };
}) {
  const patientId = searchParams.patientId || 'PAT-02';
  const procedureCode = searchParams.procedureCode || 'CGHS-ORTH-014';
  const city = searchParams.city || 'Chennai';
  const hospitalBilledAmount = Number(searchParams.hospitalBilledAmount) || 130000;

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
      <ReconciliationSummary data={data} roleLabel="Insurer Portal" />
      <InsurerView data={data} />
    </div>
  );
}
