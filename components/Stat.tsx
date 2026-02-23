export default function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="kpi">
      <div className="badge">{label}</div>
      <div className="kpi-value">{value}</div>
      {helper ? <div style={{ color: "var(--ink-1)", fontSize: 13 }}>{helper}</div> : null}
    </div>
  );
}
