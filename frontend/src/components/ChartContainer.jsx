import "./ChartContainer.css";

export default function ChartContainer({ title, updatedAt, children }) {
  return (
    <div className="chart-wrapper">
      
      <div className="chart-header">
        <h2>{title}</h2>
      </div>

      <div className="chart-content">
        {children}
      </div>

    </div>
  );
}