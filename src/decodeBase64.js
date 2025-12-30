import { CDTColorTable, CommandTable } from "./protocol";

// ---- C equivalents ----
var CDTime = new Array(16).fill(0);       // int CDTime[16]
var CDTimeInput = new Array(16).fill(0);  // int CDTimeInput[16]
let CDTColor = Array.from({ length: 16 }, () => ""); // char CDTColor[16][8]
let Command = "FIX";
const SerialNumber="1234"

export function decodeBase64Pkt(pkt, serialNumber = "1234") {
  console.log("RAW PKT:", pkt);

  // 1️⃣ Trim whitespace
  pkt = pkt.trim();

  // 2️⃣ Remove leading ? and trailing ?
  pkt = pkt.replace(/^\?/, '').replace(/\?$/, '');

  console.log("AFTER TRIM:", pkt);

  // 3️⃣ Validate Base64 characters only
  if (!/^[A-Za-z0-9+/=]+$/.test(pkt)) {
    console.error("Invalid Base64 characters still present");
    return;
  }

  let base64Data=pkt;

  let decodedData;
  try {
    const bin = atob(base64Data);
    decodedData = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      decodedData[i] = bin.charCodeAt(i);
    }
  } catch (e) {
    console.error("Base64 decode failed", e);
    return;
  }

  // ---- LENGTH CHECK ----
  const x = decodedData[0];
  const y = decodedData.length - 3;

  if (x !== y) {
    console.error(`Length mismatch: ${x} != ${y}`);
    return;
  }

  // ---- TIME ----
  const Hours = decodedData[1];
  const Mins  = decodedData[2];
  const Secs  = decodedData[3];
  console.log(`Time is ${Hours}:${Mins}:${Secs}`);

  // ---- CDTime ----
  CDTime[0] = decodedData[7];
  CDTime[1] = decodedData[8];
  CDTime[2] = decodedData[9];
  CDTime[3] = decodedData[10];

  CDTimeInput[0] = decodedData[7];
  CDTimeInput[1] = decodedData[8];
  CDTimeInput[2] = decodedData[9];
  CDTimeInput[3] = decodedData[10];

  // ---- COMMAND ----
  let cmdIdx = decodedData[29];
  if (cmdIdx >= 9) cmdIdx = 9;

  Command = CommandTable[cmdIdx];

  // ---- COLORS (BITWISE = C) ----
  CDTColor[0] = CDTColorTable[(decodedData[23] & 0xe0) >> 5];
  CDTColor[1] = CDTColorTable[(decodedData[23] & 0x1c) >> 2];
  CDTColor[2] = CDTColorTable[
    ((decodedData[23] & 0x03) << 1) +
    ((decodedData[24] & 0x80) >> 7)
  ];
  CDTColor[3] = CDTColorTable[(decodedData[24] & 0x70) >> 4];

  console.log(
    `CDT Details are ${Command} - ` +
    `${CDTime[0]}${CDTColor[0]}:` +
    `${CDTime[1]}${CDTColor[1]}:` +
    `${CDTime[2]}${CDTColor[2]}:` +
    `${CDTime[3]}${CDTColor[3]}`
  );

  const payload =
    `*TL,${serialNumber},${Command},` +
    `${CDTime[0]}${CDTColor[0]},` +
    `${CDTime[1]}${CDTColor[1]},` +
    `${CDTime[2]}${CDTColor[2]},` +
    `${CDTime[3]}${CDTColor[3]}#`;

  console.log(payload);


  return {
    Hours,
    Mins,
    Secs,
    CDTime: CDTime.slice(0, 4),
    CDTColor: CDTColor.slice(0, 4),
    Command,
    payload,
  };
}
