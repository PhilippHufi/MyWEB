import clsx from 'clsx';

export function Button({ children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
    ghost: 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
    danger: 'bg-rose-500 text-white hover:bg-rose-400'
  };
  return (
    <button
      className={clsx('inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
