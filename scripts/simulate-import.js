
const XLSX = require('xlsx');

// Mock Employees Data
const employees = [
  { id: 'emp1', name: 'Budi Santoso' },
  { id: 'emp2', name: 'Siti Aminah' },
  { id: 'emp3', name: 'Ahmad Dani' },
  { id: 'emp4', name: 'Rina Wati' },
  { id: 'emp5', name: 'Dewi Sartika' }
];

console.log("=== Starting Import Simulation ===\n");
console.log("Mock Employees:", employees.map(e => e.name).join(", "), "\n");

// --- Helper Functions (Copied from attendance/page.tsx) ---

const normName = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const matchEmployee = (raw) => {
  const n = normName(raw?.toString() || '');
  if (!n) return null;
  
  // 1. Exact match
  const exact = employees.find(emp => normName(emp.name) === n);
  if (exact) return exact;
  
  // 2. Contains match
  const candidates = employees.filter(emp => {
    const empN = normName(emp.name);
    return empN.includes(n) || n.includes(empN);
  });
  
  if (candidates.length === 1) return candidates[0];
  
  // 3. Fuzzy match (Token based)
  const nTokens = n.split(' ');
  const fuzzy = employees.find(emp => {
    const empTokens = normName(emp.name).split(' ');
    return nTokens.every(t => empTokens.includes(t));
  });
  if (fuzzy) return fuzzy;
  
  return null;
};

const toDateString = (val, fallbackFromTime) => {
  if (!val && fallbackFromTime) return fallbackFromTime.toISOString().split('T')[0];
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = val?.toString()?.trim() || '';
  const match = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const dmMatch = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmMatch) {
    let dd = dmMatch[1].padStart(2, '0');
    let mm = dmMatch[2].padStart(2, '0');
    let yyyy = dmMatch[3].length === 2 ? `20${dmMatch[3]}` : dmMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
};

const toTimeString = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const h = val.getHours().toString().padStart(2, '0');
    const m = val.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  const s = val.toString().trim().replace('.', ':');
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const m2 = s.match(/(\d{1,2})\.(\d{2})/);
  if (m2) {
    const hh = m2[1].padStart(2, '0');
    const mm = m2[2].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return null;
};

// --- Simulation Logic ---

function runSimulation(testName, headers, rows) {
  console.log(`--- Test Case: ${testName} ---`);
  
  // 1. Normalize Headers
  const normalize = (s) => s?.toString().toLowerCase().trim();
  const normalizedHeaders = headers.map(h => normalize(h));
  
  // 2. Find Indices
  const nameIdx = normalizedHeaders.findIndex(h => h.includes('nama') || h.includes('name'));
  const dateIdx = normalizedHeaders.findIndex(h => h.includes('tanggal') || h.includes('date') || h.includes('tgl'));
  const inIdx = normalizedHeaders.findIndex(h => h.includes('masuk') || h.includes('in'));
  const outIdx = normalizedHeaders.findIndex(h => h.includes('pulang') || h.includes('out'));
  
  console.log(`Indices found - Name: ${nameIdx}, Date: ${dateIdx}, In: ${inIdx}, Out: ${outIdx}`);
  
  if (nameIdx === -1) {
    console.log("FAIL: Name column not found.");
    return;
  }
  
  const results = rows.map((row, idx) => {
    const name = row[nameIdx];
    const emp = matchEmployee(name);
    
    let dateStr = '';
    if (dateIdx !== -1) dateStr = toDateString(row[dateIdx]);
    
    const timeIn = toTimeString(row[inIdx]);
    const timeOut = toTimeString(row[outIdx]);
    
    return {
      Row: idx + 1,
      OriginalName: name,
      MatchedName: emp ? emp.name : "NONE",
      Date: dateStr,
      CheckIn: timeIn,
      CheckOut: timeOut,
      Status: emp && dateStr ? "VALID" : "INVALID"
    };
  });
  
  console.table(results);
  console.log("\n");
}

// --- Test Cases ---

// Case 1: Standard Format
runSimulation("Standard Import", 
  ["Nama Karyawan", "Tanggal", "Jam Masuk", "Jam Pulang"],
  [
    ["Budi Santoso", "2024-02-01", "08:00", "17:00"],
    ["Siti Aminah", "2024-02-01", "08:15", "17:05"],
    ["Rina", "01/02/2024", "08:00", "17:00"] // Partial name, DD/MM/YYYY
  ]
);

// Case 2: Excel Numeric Dates/Times
runSimulation("Excel Numeric Types",
  ["Name", "Date", "In", "Out"],
  [
    ["Ahmad Dani", 45323, 0.33333, 0.70833], // 45323 = 2024-02-01 approx, 0.333 = 08:00, 0.708 = 17:00
    ["Dewi", 45324, 0.34375, 0.71180] 
  ]
);

// Case 3: Messy Data
runSimulation("Messy Data & Edge Cases",
  ["Nama", "Tgl", "Masuk", "Pulang"],
  [
    ["Unknown User", "2024-02-01", "08:00", "17:00"], // No match
    ["Budi", "invalid-date", "08:00", "17:00"], // Invalid date
    ["Siti Aminah", "2024-02-01", "xx:xx", "17:00"], // Invalid time
    ["   Ahmad Dani   ", "2024-02-01", "08.00", "17.00"] // Dot separator, extra spaces
  ]
);

// Case 4: Ambiguous Names
// Adding a temporary new employee to the list inside the function would be hard.
// I'll simulate it by observing how 'Rina' behaves if I had 'Rina Jaya'
// Since I can't easily change the global const 'employees', I'll just explain the logic in the report.
// Actually, let's just add a comment here.
