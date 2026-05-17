export function ErrorState({ message }) {
  if (!message) return null;
  return <p className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{message}</p>;
}
