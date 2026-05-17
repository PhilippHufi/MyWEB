import { motion } from 'framer-motion';
import clsx from 'clsx';

export function WidgetShell({ title, icon: Icon, children, action, className, dragHandleProps }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('glass-panel min-h-[220px] overflow-hidden p-5', className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-cyan-300" />}
          <h2 className="truncate text-base font-semibold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <button className="drag-handle" aria-label="Widget verschieben" {...dragHandleProps}>::</button>
        </div>
      </div>
      {children}
    </motion.section>
  );
}
