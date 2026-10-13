import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';

export type CompletenessItem = {
  label: string;
  done: boolean;
};

export function CompletenessChecklist({ items }: { items: CompletenessItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const pct = Math.round((doneCount / totalCount) * 100);
  const allDone = doneCount === totalCount;

  return (
    <Card className={allDone ? 'outline outline-1 -outline-offset-1 outline-teal-300/50' : 'outline outline-1 -outline-offset-1 outline-amber-300/50'}>
      <CardHeader
        title="Checklist"
        action={
          <Badge tone={allDone ? 'verified' : 'amber'} className="py-0.5 px-2.5 text-xs">
            {allDone ? 'Ready' : `${doneCount}/${totalCount} Done`}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/40 backdrop-blur-md outline outline-1 -outline-offset-1 outline-white/50">
          <div
            className={`h-full transition-all duration-300 ${allDone ? 'bg-teal-600' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-lg border border-white/50 bg-white/35 backdrop-blur-md px-3 py-2 text-xs"
            >
              <span
                aria-hidden
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  item.done ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {item.done ? '✓' : '!'}
              </span>
              <span className={item.done ? 'text-slate-600' : 'font-semibold text-slate-900'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
