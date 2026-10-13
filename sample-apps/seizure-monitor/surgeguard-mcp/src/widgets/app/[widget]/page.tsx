import { notFound } from 'next/navigation';
import CapacityBoard from '../capacity-board/page';
import CommandCenter from '../command-center/page';
import ExecutionMonitor from '../execution-monitor/page';
import IncidentBrief from '../incident-brief/page';
import PlanComparison from '../plan-comparison/page';
import PlanReview from '../plan-review/page';
import PolicyGate from '../policy-gate/page';
import QueuePressure from '../queue-pressure/page';
import StaffingReadiness from '../staffing-readiness/page';

const widgetAliases = {
  'next-capacity-board': CapacityBoard,
  'next-command-center': CommandCenter,
  'next-command-center-v2': CommandCenter,
  'next-execution-monitor': ExecutionMonitor,
  'next-incident-brief': IncidentBrief,
  'next-plan-comparison': PlanComparison,
  'next-plan-comparison-v2': PlanComparison,
  'next-plan-review': PlanReview,
  'next-plan-review-v2': PlanReview,
  'next-policy-gate': PolicyGate,
  'next-policy-gate-v2': PolicyGate,
  'next-queue-pressure': QueuePressure,
  'next-staffing-readiness': StaffingReadiness,
} as const;

type WidgetAlias = keyof typeof widgetAliases;

export function generateStaticParams() {
  return Object.keys(widgetAliases).map((widget) => ({ widget }));
}

export default function WidgetAliasPage({
  params,
}: {
  params: { widget: string };
}) {
  const WidgetComponent = widgetAliases[params.widget as WidgetAlias];
  if (!WidgetComponent) notFound();
  return <WidgetComponent />;
}
