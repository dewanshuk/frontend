export default function LandingSectionPanel({ children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-[#d9d9d9]/60 bg-white shadow-[0_10px_20px_rgba(23,28,143,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
