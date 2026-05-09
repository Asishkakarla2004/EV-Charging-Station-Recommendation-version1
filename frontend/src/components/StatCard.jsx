const StatCard = ({ label, value, hint }) => (
  <div className="app-panel-muted p-5">
    <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    {hint ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{hint}</p> : null}
  </div>
);

export default StatCard;
