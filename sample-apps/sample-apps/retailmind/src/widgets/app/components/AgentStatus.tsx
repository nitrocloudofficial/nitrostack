interface AgentStatusProps {
  name: string;
  description?: string;
  status: "waiting" | "running" | "complete";
}

export default function AgentStatus({
  name,
  description,
  status,
}: AgentStatusProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
      
      <div>
        <p className="font-medium text-gray-900">
          {name}
        </p>

        {description && (
          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>

      <div>
        {status === "complete" && (
          <span className="font-medium text-green-600">
            ✓ Complete
          </span>
        )}

        {status === "running" && (
          <span className="animate-pulse font-medium text-blue-600">
            ● Running
          </span>
        )}

        {status === "waiting" && (
          <span className="font-medium text-gray-400">
            ○ Waiting
          </span>
        )}
      </div>

    </div>
  );
}