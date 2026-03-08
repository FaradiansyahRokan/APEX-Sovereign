export const CONTRACTS = {
  // L1 & L2 (Data Layer)
  REPUTATION_LEDGER: "0xEEff17E284d64dcBFB0D3e5b8867F83a95EB44A5",
  SOVEREIGN_ID: "0x6141aE1ee80fF18A239Fa427c2d6d65982602FaC",

  // L2 (Economy/Value Layer)
  BENEVOLENCE_VAULT: "0x4B1301a72Da30c4ab3E0CaeFf40Ca28A0b416088",
  SUPPLY_GOVERNOR: "0x5fEdD60933aF9410f9Fa1eAb14E50a414Aa680c4",

  // L7 (Macro Impact)
  CRISIS_FUND: "0x28f8D147e76f0D88ccbf80B2FA10Eec7eE41C9C6",
};


export const HAVEN_CHAIN = {
  id: 777000,
  name: "BridgeStone",
  rpc: process.env.NEXT_PUBLIC_RPC_URL ||
    "https://moves-score-payments-armor.trycloudflare.com/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
  symbol: "VELD",
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