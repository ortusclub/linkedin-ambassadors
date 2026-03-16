// Auto-assessment engine for ambassador applications
// Scores LinkedIn profiles and generates monthly offers

interface ProfileData {
  linkedinUrl: string;
  connectionCount?: number;
  industry?: string;
  location?: string;
  hasProfilePhoto?: boolean;
  isVerified?: boolean;
  accountAgeYears?: number;
  hasSalesNav?: boolean;
  headline?: string;
}

interface AssessmentResult {
  score: number; // 0-100
  offeredAmount: number; // monthly $ amount
  breakdown: {
    category: string;
    points: number;
    maxPoints: number;
    reason: string;
  }[];
  tier: "starter" | "standard" | "premium" | "elite";
  autoApproved: boolean;
}

// Industry multipliers — some industries are more valuable for outreach
const INDUSTRY_MULTIPLIERS: Record<string, number> = {
  technology: 1.3,
  saas: 1.3,
  "software": 1.3,
  finance: 1.25,
  "financial services": 1.25,
  banking: 1.25,
  consulting: 1.2,
  "management consulting": 1.2,
  healthcare: 1.15,
  "real estate": 1.15,
  insurance: 1.1,
  marketing: 1.1,
  sales: 1.1,
  recruiting: 1.05,
  "human resources": 1.05,
  education: 1.0,
  retail: 0.95,
  hospitality: 0.9,
};

function getIndustryMultiplier(industry?: string): number {
  if (!industry) return 1.0;
  const lower = industry.toLowerCase();
  for (const [key, mult] of Object.entries(INDUSTRY_MULTIPLIERS)) {
    if (lower.includes(key)) return mult;
  }
  return 1.0;
}

export function assessProfile(data: ProfileData): AssessmentResult {
  const breakdown: AssessmentResult["breakdown"] = [];
  let totalScore = 0;

  // 1. Connection count (0-30 points)
  const connections = data.connectionCount || 0;
  let connectionPoints = 0;
  if (connections >= 10000) connectionPoints = 30;
  else if (connections >= 5000) connectionPoints = 25;
  else if (connections >= 2000) connectionPoints = 20;
  else if (connections >= 1000) connectionPoints = 15;
  else if (connections >= 500) connectionPoints = 10;
  else if (connections >= 100) connectionPoints = 5;
  breakdown.push({
    category: "Connections",
    points: connectionPoints,
    maxPoints: 30,
    reason: `${connections.toLocaleString()} connections`,
  });
  totalScore += connectionPoints;

  // 2. Industry value (0-20 points)
  const industryMult = getIndustryMultiplier(data.industry);
  const industryPoints = Math.round((industryMult - 0.9) * 50); // 0-20 range
  breakdown.push({
    category: "Industry",
    points: Math.min(industryPoints, 20),
    maxPoints: 20,
    reason: data.industry || "Not specified",
  });
  totalScore += Math.min(industryPoints, 20);

  // 3. Profile photo (0-10 points)
  const photoPoints = data.hasProfilePhoto ? 10 : 0;
  breakdown.push({
    category: "Profile Photo",
    points: photoPoints,
    maxPoints: 10,
    reason: data.hasProfilePhoto ? "Has profile photo" : "No profile photo",
  });
  totalScore += photoPoints;

  // 4. Verification (0-15 points)
  const verifiedPoints = data.isVerified ? 15 : 0;
  breakdown.push({
    category: "Verified",
    points: verifiedPoints,
    maxPoints: 15,
    reason: data.isVerified ? "LinkedIn verified" : "Not verified",
  });
  totalScore += verifiedPoints;

  // 5. Account age (0-15 points)
  const ageYears = data.accountAgeYears || 0;
  let agePoints = 0;
  if (ageYears >= 10) agePoints = 15;
  else if (ageYears >= 5) agePoints = 12;
  else if (ageYears >= 3) agePoints = 8;
  else if (ageYears >= 1) agePoints = 5;
  breakdown.push({
    category: "Account Age",
    points: agePoints,
    maxPoints: 15,
    reason: ageYears > 0 ? `${ageYears} years old` : "Unknown age",
  });
  totalScore += agePoints;

  // 6. Sales Navigator (0-10 points)
  const salesNavPoints = data.hasSalesNav ? 10 : 0;
  breakdown.push({
    category: "Sales Navigator",
    points: salesNavPoints,
    maxPoints: 10,
    reason: data.hasSalesNav ? "Has Sales Navigator" : "No Sales Navigator",
  });
  totalScore += salesNavPoints;

  // Calculate tier and offer
  let tier: AssessmentResult["tier"];
  let baseAmount: number;

  if (totalScore >= 70) {
    tier = "elite";
    baseAmount = 40;
  } else if (totalScore >= 50) {
    tier = "premium";
    baseAmount = 30;
  } else if (totalScore >= 30) {
    tier = "standard";
    baseAmount = 20;
  } else {
    tier = "starter";
    baseAmount = 12;
  }

  // Apply industry multiplier to base amount
  const offeredAmount = Math.round(baseAmount * industryMult);

  // Auto-approve if score is high enough and they have a photo
  const autoApproved = totalScore >= 25 && (data.hasProfilePhoto !== false);

  return {
    score: totalScore,
    offeredAmount,
    breakdown,
    tier,
    autoApproved,
  };
}

// Try to extract data from a LinkedIn profile URL by scraping public info
// In V1 this uses heuristics from the application form data
// In V2 this could use a LinkedIn scraping service
export function assessFromApplication(app: {
  connectionCount?: number | null;
  industry?: string | null;
  location?: string | null;
  notes?: string | null;
}): AssessmentResult {
  // Parse hints from notes
  const notes = (app.notes || "").toLowerCase();
  const hasSalesNav = notes.includes("sales nav") || notes.includes("navigator");
  const hasPhoto = !notes.includes("no photo") && !notes.includes("no picture");
  const isVerified = notes.includes("verified");

  // Estimate age from notes
  let ageYears = 0;
  const ageMatch = notes.match(/(\d+)\+?\s*year/);
  if (ageMatch) ageYears = parseInt(ageMatch[1]);

  return assessProfile({
    linkedinUrl: "",
    connectionCount: app.connectionCount || undefined,
    industry: app.industry || undefined,
    location: app.location || undefined,
    hasProfilePhoto: hasPhoto,
    isVerified,
    accountAgeYears: ageYears,
    hasSalesNav,
  });
}
