export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-dark/80">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-medium border-t-teal-dark" />
      <span>{label}</span>
    </div>
  );
}


