const message1 = "Akun ini tidak punya akses ke workspace ini";
const message2 = "Token ini terdaftar untuk bisnis lain";

function isCross(message) {
  const lower = message.trim().toLowerCase();
  return lower.includes("token ini terdaftar untuk bisnis lain") ||
      lower.includes("login di subdomain yang benar");
}

console.log("message1 cross?", isCross(message1));
console.log("message2 cross?", isCross(message2));
