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
  const [localHours,setLocalHours]=useState(Hours);
  const [localMins,setLocalMins]=useState(Mins);
  const [localSecs,setLocalSecs]=useState(Secs);
  const [localCDTTime, setLocalCDTTime] = useState([CDTTime]);

  useEffect(()=>{
   setLocalHours(Hours);
  },[Hours])

  useEffect(()=>{
   setLocalMins(Mins);
  },[Mins])

  useEffect(()=>{
   setLocalCDTTime(CDTTime);
  },[CDTTime])


  // Interval: increase time & decrease CDTTime
  useEffect(() => {
    const interval = setInterval(() => {
      // Update seconds/minutes/hours
      setLocalSecs(prev => {
        if (prev + 1 === 60) {
          setLocalMins(m => {
            if (m + 1 === 60) {
              setLocalHours(h => h + 1);
              return 0;
            }
            return m + 1;
          });
          return 0;
        }
        return prev + 1;
      });

      // Decrease CDTTime array values
      setLocalCDTTime(prev => prev.map(val => (val > 0 ? val - 1 : 0)));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  
  return (
    <div className="traffic-container">
      {/* Time */}
      <div className="time">{localHours}:{localMins}:{localSecs}</div>

      {/* Counts */}
      {columns.map((col, i) => (
        <div key={i} className="count">
          {localCDTTime[i]}
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
