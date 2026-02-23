export default function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      {title ? <div className="section-title">{title}</div> : null}
      {children}
    </div>
  );
}
