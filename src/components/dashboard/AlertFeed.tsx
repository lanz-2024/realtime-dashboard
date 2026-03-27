'use client';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
}

const severityColors: Record<Alert['severity'], string> = {
  critical: 'border-red-500 bg-red-950 text-red-300',
  warning: 'border-yellow-500 bg-yellow-950 text-yellow-300',
  info: 'border-blue-500 bg-blue-950 text-blue-300',
};

const severityLabels: Record<Alert['severity'], string> = {
  critical: 'CRITICAL',
  warning: 'WARN',
  info: 'INFO',
};

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  const recent = alerts.slice(0, 20);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 h-full">
      <h3 className="text-gray-400 text-sm font-medium mb-4">Alert Feed</h3>
      {recent.length === 0 ? (
        <p className="text-gray-600 text-sm">No alerts — all systems normal</p>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-64">
          {recent.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg px-3 py-2 border-l-2 text-xs ${severityColors[alert.severity]}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{severityLabels[alert.severity]}</span>
                <span className="opacity-60">{alert.time}</span>
              </div>
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
