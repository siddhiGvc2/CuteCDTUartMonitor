import { useEffect, useState } from "react";
import "../App.css";

export default function TrafficGrid({timer}) {
  const [time, setTime] = useState("");
  const [columns, setColumns] = useState([
    { count: 3, color: "red" },
    { count: 3, color: "yellow" },
    { count: 14, color: "green" },
    { count: 27, color: "red" },
  ]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB"));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="traffic-container">
      {/* Time */}
      <div className="time">{timer}</div>

      {/* Counts */}
      {columns.map((col, i) => (
        <div key={i} className="count">
          {col.count}
        </div>
      ))}

      {/* Red row */}
      {columns.map((col, i) => (
        <div
          key={`red-${i}`}
          className={`cell ${col.color === "red" ? "red" : ""}`}
        />
      ))}

      {/* Yellow row */}
      {columns.map((col, i) => (
        <div
          key={`yellow-${i}`}
          className={`cell ${col.color === "yellow" ? "yellow" : ""}`}
        />
      ))}

      {/* Green row */}
      {columns.map((col, i) => (
        <div
          key={`green-${i}`}
          className={`cell ${col.color === "green" ? "green" : ""}`}
        />
      ))}
    </div>
  );
}
