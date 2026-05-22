const fs = require('fs');
const content = fs.readFileSync('frontend/src/app/(dashboard)/[tenant]/admin/(internal)/layout.tsx', 'utf-8');
console.log(content.includes('if (errorType === "auth")'));
console.log(content.includes('<AdminShellAuthError'));
