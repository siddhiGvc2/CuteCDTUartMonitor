import { useState, useRef, useEffect } from "react";
import "./App.css";


function getTime(){
  const now = new Date();

// Get hours and minutes
const hours = now.getHours().toString().padStart(2, '0');
const minutes = now.getMinutes().toString().padStart(2, '0');

// Format as hh:mm
const timeString = `${hours}:${minutes}`;
  return timeString;

}


function transformMessage(msg) {
    const prefix = "*CHENA:";
    const suffix = "#";
    const core = msg.slice(prefix.length, -1); // "1:1:0:1:1:1:1"

    const parts = core.split(':'); // ['1', '1', '0', '1', '1', '1', '1']
    
    let result = [parts[0]]; // Keep the first part as-is ('1')

    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '1') {
            result.push((i + 1).toString());  // Position index +1
        }
    }

    return `${result.join(':')}`;
}





export default function App() {
  const [port, setPort] = useState(null);
  const [writer, setWriter] = useState(null);
  const [reader, setReader] = useState(null);
  const [uartData, setUartData] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [capture,setCapture]=useState(false);
  const [mode, setMode] = useState('capture'); // 'capture' or 'play'
  const [isStarted, setIsStarted] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [fileName, setFileName] = useState('');
  const [capturedPackets, setCapturedPackets] = useState([]);
  const timerRef = useRef(null);

  // Parsed device info
  const [deviceInfo, setDeviceInfo] = useState({
    macId: "",
    fwVersion: "",
    serialNumber: "",
    ssid: "",
    ssid1: "",
    ssid2: "",
    ssid3: "",
    hbt_counter:0,
    hbt_timer:0,
    wifi_errors:0,
    tcp_errors:0,
    mqtt_errors:0,
    mqtt_status:"FAILED",
    tcp_status:"FAILED",
    wifi_status:"FAILED",
    wifi_failure_duration: "", // Store the duration
    wifi_failed_at: "", // Reset failure timestamp
    lastTc:"",
    lastPulses:"",
    tc:"",
    pulses:"",
    tcp_command:"",
    mqtt_command:"",
    tcp_command_time:"",
    mqtt_command_time:"",
    inh:"",

  });

  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [uartData]);

 

useEffect(() => {
  let intervalId;

  if (status === "Connected") {
    intervalId = setInterval(() => {
      setDeviceInfo((prev) => ({
        ...prev,
        hbt_timer: (prev.hbt_timer || 0) + 1,
      }));
    }, 1000);
  } else {
    setDeviceInfo((prev) => ({
      ...prev,
      hbt_timer: 0,
    }));
  }

  // Cleanup function to clear interval when component unmounts or status changes
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [status]);




const handleStart = () => {
  if (mode === 'capture') {
    // Generate file name
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    setFileName(`CDACCute.${dateStr}.${timeStr}.txt`);
    setCapturedPackets([]);
    setTimer('00:00:00');
    setIsStarted(true);
    // Start timer
    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds++;
      const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      setTimer(`${hrs}:${mins}:${secs}`);
    }, 1000);
  } else if (mode === 'play') {
    // For play mode, load file and start timed playback
    if (fileName) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const packets = content.split('\n').filter(line => line.trim()).map(line => {
          const [timestamp, data] = line.split(' - ');
          return { timestamp, data };
        });
        setCapturedPackets(packets);
        setTimer('00:00:00');
        setIsStarted(true);
        // Start timer
        let seconds = 0;
        timerRef.current = setInterval(() => {
          seconds++;
          const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
          const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
          const secs = (seconds % 60).toString().padStart(2, '0');
          setTimer(`${hrs}:${mins}:${secs}`);
        }, 1000);

        // Schedule packet sending
        packets.forEach((packet, index) => {
          const [hrs, mins, secs] = packet.timestamp.split(':').map(Number);
          const packetTime = hrs * 3600 + mins * 60 + secs;
          setTimeout(async () => {
            if (writer && isStarted) {
              // Send packet as binary
              const bytes = packet.data.split(' ').map(h => parseInt(h, 16));
              await writer.write(new Uint8Array(bytes));
              // Display in terminal
              setUartData(prev => prev + `${packet.timestamp} - ${packet.data}\n`);
            }
          }, packetTime * 1000);
        });
      };
      reader.readAsText(fileName);
    }
  }
};

const handleStop = () => {
  if (mode === 'capture' && capturedPackets.length > 0) {
    // Save to file
    const content = capturedPackets.map(p => `${p.timestamp} - ${p.data}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    // Display captured data in terminal
    setUartData(content);
  }
  setIsStarted(false);
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

let uartBuffer = "";


  // Connect to UART
 const connectSerial = async () => {
  try {
    const selectedPort = await navigator.serial.requestPort();
    await selectedPort.open({ baudRate: 115200 });
    setPort(selectedPort);
    setStatus("Connected");

    // Setup writer
    const writer = selectedPort.writable.getWriter();
    setWriter(writer);

    // 🟢 Automatically send *RST# every time we connect/reconnect
    await writer.write(new TextEncoder().encode("*RST#\n"));
    setTimeout(async()=>{
      await writer.write(new TextEncoder().encode("*SSID?#\n"));
     
    },5000)

    setTimeout(async()=>{
      await writer.write(new TextEncoder().encode("*TC?#\n"));
      setTimeout(async()=>{
          await writer.write(new TextEncoder().encode("*PULSES?#\n"));
      },2000)
    
    },10000)

    // Setup reader
    const reader = selectedPort.readable.getReader();
    setReader(reader);

    const decoder = new TextDecoder();
    let packetBuffer = new Uint8Array(); // Buffer for binary packets
    const readLoop = async () => {
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const uint8Array = new Uint8Array(value);
        const text = decoder.decode(value);

        

        uartBuffer += text;

        // ✅ Extract only complete messages like "*...#"
        const regex = /\*[^#]*#/g;
        let match;
        while ((match = regex.exec(uartBuffer)) !== null) {
          const line = match[0].trim(); // full message, e.g. "*HBT-S#"
          // parseDeviceInfo(line);        // send to parser
        }

        // Keep only the leftover (after last #)
        const lastHash = uartBuffer.lastIndexOf("#");
        if (lastHash >= 0) {
          uartBuffer = uartBuffer.slice(lastHash + 1);
        }

        // Process binary packets: 0xff ... 0xfe
        for (let i = 0; i < uint8Array.length; i++) {
          const byte = uint8Array[i];
          if (byte === 0xff) {
            // Start of packet
            packetBuffer = new Uint8Array([byte]);
          } else if (byte === 0xfe && packetBuffer.length > 0) {
            // End of packet
            setUartData((prev) => prev + "/r/n");
            packetBuffer = new Uint8Array([...packetBuffer, byte]);
            if (isStarted && mode === 'capture') {
              // Save packet with timestamp
              const hexData = Array.from(packetBuffer).map(b => b.toString(16).padStart(2, '0')).join(' ');
              setCapturedPackets(prev => {
                const newPackets = [...prev, { timestamp: timer, data: hexData }];
                // Display in real-time
                setUartData(newPackets.map(p => `${p.timestamp} - ${p.data}`).join('\n'));
                return newPackets;
              });
            }
            packetBuffer = new Uint8Array();
          } else if (packetBuffer.length > 0) {
            // Continue packet
            packetBuffer = new Uint8Array([...packetBuffer, byte]);
          }
        }
      }
    }
  } catch (err) {
    console.error("Read loop stopped:", err);
  } finally {
    reader.releaseLock();
  }
};


    readLoop();
  } catch (err) {
    console.error("Error connecting to UART:", err);
    setStatus("Error");
  }
};


  // Disconnect UART
  const disconnectSerial = async () => {
    try {
      if (reader) {
        await reader.cancel();
        reader.releaseLock();
        setReader(null);
      }
      if (writer) {
        writer.releaseLock();
        setWriter(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setUartData("");
      setDeviceInfo({  macId: "",
    fwVersion: "",
    serialNumber: "",
    ssid: "",
    ssid1: "",
    ssid2: "",
    ssid3: "",
    hbt_counter:0,
    hbt_timer:0,
    wifi_errors:0,
    tcp_errors:0,
    mqtt_errors:0,
    mqtt_status:"FAILED",
    tcp_status:"FAILED",
    wifi_status:"FAILED",
    wifi_failure_duration: "", // Store the duration
    wifi_failed_at: "", // Reset failure timestamp
    tc:"",
    pulses:"",
    lastTc:"",
    lastPulses:"",
    tcp_command_time:"",
    mqtt_command_time:"",
    inh:""});
      setStatus("Disconnected");
      console.log("✅ Disconnected and cleared data");
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  };

  const sendSerial = async () => {
    if (!writer || !msg) return;
    try {
      await writer.write(new TextEncoder().encode(msg + "\n"));
      if(msg.includes("*RST#"))
      {
         setDeviceInfo((prev) => ({
          ...prev,
          ssid: "0"
        }));
          setTimeout(async()=>{
          await writer.write(new TextEncoder().encode("*SSID?#\n"));
        },5000)
      }
      setMsg("");
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div style={{width:'100%',display:"flex",justifyContent:"space-around"}}>
        <h1 className="title">UART Monitor- Cute CDT </h1>
          <div className="center">
            <div>
              <label>
                <input type="radio" value="capture" checked={mode === 'capture'} onChange={(e) => setMode(e.target.value)} />
                Capture
              </label>
              <label>
                <input type="radio" value="play" checked={mode === 'play'} onChange={(e) => setMode(e.target.value)} />
                Play
              </label>
            </div>
            <div>
              <button onClick={handleStart} className="btn connect" disabled={isStarted}>Start</button>
              <button onClick={handleStop} className="btn disconnect" disabled={!isStarted}>Stop</button>
            </div>
            {mode === 'play' && (
              <input type="file" accept=".txt" onChange={(e) => setFileName(e.target.files[0])} />
            )}
            <div>Timer: {timer}</div>
          </div>
          <div>
        {/* Status */}
        <p className={`status ${status === "Connected" ? "connected" : "disconnected"}`}>
          Status: {status}
        </p>


        {/* Connect / Disconnect */}
        {!port ? (
          <div className="center">
            <button onClick={connectSerial} className="btn connect">
              Connect UART
            </button>
          </div>
        ) : (
          <div className="center">
            <button onClick={disconnectSerial} className="btn disconnect">
              Disconnect
            </button>
          </div>
        )}
        </div>
        </div>
        {/* Send */}
        <div className="send-section">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Enter UART command"
            className="input"
          />
          <button onClick={sendSerial} className="btn send" disabled={!writer || !msg}>
            Send
          </button>
          <button
            onClick={() => {
              setUartData("");
              setDeviceInfo({ macId: "", fwVersion: "", serialNumber: "", ssid: "" });
            }}
            className="btn clear"
            disabled={!uartData}
          >
            Clear Terminal
          </button>
        </div>

        {/* Device Info Cards */}
        
      

        {/* Terminal */}
        <h2 className="subtitle">Incoming UART Data:</h2>
        <div className="terminal" ref={terminalRef}>
          <pre>{uartData || "No data yet..."}</pre>
        </div>
      </div>
    </div>
  );
}
