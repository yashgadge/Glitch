const XLSX = require('xlsx');

const data = [
  {
    "Name": "John Doe",
    "Email": "john.doe+v6@example.com",
    "Mobile": "1234567890",
    "Registration ID": "REG-001",
    "Team Name": "Alpha Team",
    "Team Code": "ALPHA123",
    "Track": "Web"
  },
  {
    "Name": "Jane Smith",
    "Email": "jane.smith+v6@example.com",
    "Mobile": "0987654321",
    "Registration ID": "REG-002",
    "Team Name": "Alpha Team",
    "Team Code": "ALPHA123",
    "Track": "Web"
  },
  {
    "Name": "Alex Hacker",
    "Email": "alex.hacker+v6@example.com",
    "Mobile": "5555555555",
    "Registration ID": "REG-003",
    "Team Name": "Beta Squad",
    "Team Code": "BETA456",
    "Track": "AI"
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Participants");

XLSX.writeFile(wb, "mock_participants.xlsx");
console.log("XLSX generated");
