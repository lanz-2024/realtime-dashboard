'use client';

export function RefreshToggle({
  isLive,
  onToggle,
}: {
  isLive: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isLive
          ? 'bg-green-900 text-green-300 hover:bg-green-800'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
      aria-pressed={isLive}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
        }`}
      />
      {isLive ? 'Live' : 'Paused'}
    </button>
  );
}
