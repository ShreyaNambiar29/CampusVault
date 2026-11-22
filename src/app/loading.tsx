export default function Loading() {
  return (
    <div className="loading-page" aria-label="Loading workspace">
      <div className="skeleton" style={{ height: 40, width: "40%" }} />
      <div className="skeleton" style={{ height: 220 }} />
      <div className="skeleton" style={{ height: 160 }} />
      <div className="skeleton" style={{ height: 300 }} />
    </div>
  );
}
