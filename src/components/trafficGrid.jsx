import { useEffect, useState } from "react";
import "../App.css";

export default function TrafficGrid({Hours,Mins,Secs,CDTTime,CDTColor}) {
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
      <div className="time">{Hours}:{Mins}:{Secs}</div>

      {/* Counts */}
      {columns.map((col, i) => (
        <div key={i} className="count">
          {CDTTime[i]}
        </div>
      ))}

      {/* Red row */}
      {columns.map((col, i) => (
        <div
          key={`red-${i}`}
          className={`cell ${CDTColor[i] === "R" ? "red" : ""}`}
        />
      ))}

      {/* Yellow row */}
      {columns.map((col, i) => (
        <div
          key={`yellow-${i}`}
          className={`cell ${CDTColor[i] === "Y" ? "yellow" : ""}`}
        />
      ))}

      {/* Green row */}
      {columns.map((col, i) => (
        <div
          key={`green-${i}`}
          className={`cell ${CDTColor[i] === "G" ? "green" : ""}`}
        />
      ))}
    </div>
  );
}
