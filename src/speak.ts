const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underThousand(n: number): string {
  if (n < 20) return ONES[n] ?? String(n);
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)] ?? "";
    const rest = n % 10;
    return rest ? `${tens} ${ONES[rest]}` : tens;
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${ONES[hundreds]} hundred ${underThousand(rest)}` : `${ONES[hundreds]} hundred`;
}

export function speakInr(amount: number): string {
  if (amount === 0) return "zero rupees";
  if (amount < 100000) {
    const thousand = Math.floor(amount / 1000);
    const rest = amount % 1000;
    if (thousand && !rest) return `${underThousand(thousand)} thousand rupees`;
    if (thousand) return `${underThousand(thousand)} thousand ${underThousand(rest)} rupees`;
    return `${underThousand(amount)} rupees`;
  }
  return `${amount.toLocaleString("en-IN")} rupees`;
}

export function speakVehicle(registration: string): string {
  const compact = registration.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return compact
    .split("")
    .map((ch) => (/\d/.test(ch) ? ONES[Number(ch)] ?? ch : ch))
    .join(" ");
}

export function speakPolicy(policyNumber: string): string {
  return policyNumber.replaceAll("-", " ");
}
