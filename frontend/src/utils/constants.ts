export const CONTRACTS = {
  // L1 & L2 (Data Layer)
  REPUTATION_LEDGER: "0xBfD647E7DA80be6c9ACc74c1B29B610871923825",
  SOVEREIGN_ID: "0xEBdAADcdB188B5fbAd7a5d0701C4250bfEAcff07",

  // L2 (Economy/Value Layer)
  BENEVOLENCE_VAULT: "0x7E550F089B91Ccb233266Cc25b1C5Cff97730422",
  SUPPLY_GOVERNOR: "0x3DEE305134b715A5d9BE191F6172A3a9107213ae",

  // L7 (Macro Impact)
  CRISIS_FUND: "0xAAc8D8Aa86D46F008562f1e9883ea9058C938EEB",
};


export const HAVEN_CHAIN = {
  id: 666999,
  name: "BridgeStone",
  rpc: process.env.NEXT_PUBLIC_RPC_URL ||
    "https://answer-hansen-understand-built.trycloudflare.com/ext/bc/Yxdrh1Sof5JoTTn66vQjNLdvf7JMYvwMMYUWrjAJBphQ2W9qs/rpc",
  symbol: "GOOD",
  decimals: 18,
} as const;

export const ACTION_TYPES = [
  { value: "FOOD_DISTRIBUTION", label: "Food Distribution", emoji: "🍚", baseScore: 80 },
  { value: "MEDICAL_AID", label: "Medical Aid", emoji: "🏥", baseScore: 85 },
  { value: "SHELTER_CONSTRUCTION", label: "Shelter Construction", emoji: "🏠", baseScore: 75 },
  { value: "EDUCATION_SESSION", label: "Education Session", emoji: "📚", baseScore: 70 },
  { value: "DISASTER_RELIEF", label: "Disaster Relief", emoji: "🆘", baseScore: 90 },
  { value: "CLEAN_WATER_PROJECT", label: "Clean Water Project", emoji: "💧", baseScore: 78 },
  { value: "MENTAL_HEALTH_SUPPORT", label: "Mental Health Support", emoji: "💚", baseScore: 72 },
  { value: "ENVIRONMENTAL_ACTION", label: "Environmental Action", emoji: "🌱", baseScore: 65 },
];

export const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical", color: "red", multiplier: 3.0 },
  { value: "HIGH", label: "High", color: "orange", multiplier: 2.0 },
  { value: "MEDIUM", label: "Medium", color: "yellow", multiplier: 1.5 },
  { value: "LOW", label: "Low", color: "green", multiplier: 1.0 },
];

export const REPUTATION_RANKS = [
  { rank: "CITIZEN", threshold: 0, color: "gray", icon: "citizen", description: "Beginning the journey" },
  { rank: "GUARDIAN", threshold: 100, color: "blue", icon: "guardian", description: "Protector of the vulnerable" },
  { rank: "CHAMPION", threshold: 500, color: "purple", icon: "champion", description: "Champion of equity" },
  { rank: "SOVEREIGN", threshold: 2000, color: "gold", icon: "sovereign", description: "Sovereign of benevolence" },
  { rank: "HAVEN", threshold: 10000, color: "rainbow", icon: "haven", description: "Haven of humanity" },
];

export const getRank = (score: number) => {
  const ranks = [...REPUTATION_RANKS].reverse();
  return ranks.find((r) => score >= r.threshold) || REPUTATION_RANKS[0];
};