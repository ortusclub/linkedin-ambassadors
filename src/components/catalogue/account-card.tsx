"use client";

import Link from "next/link";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface AccountCardProps {
  account: {
    id: string;
    linkedinName: string;
    linkedinHeadline: string | null;
    connectionCount: number;
    industry: string | null;
    location: string | null;
    profilePhotoUrl: string | null;
    accountAgeMonths: number | null;
    hasSalesNav: boolean;
    monthlyPrice: number | string;
  };
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0A66C2,#004182)",
  "linear-gradient(135deg,#00B85C,#007A3D)",
  "linear-gradient(135deg,#7C3AED,#5B21B6)",
  "linear-gradient(135deg,#DC2626,#991B1B)",
  "linear-gradient(135deg,#D97706,#92400E)",
  "linear-gradient(135deg,#0891B2,#155E75)",
];

function getInitials(name: string) {
  return name
    .replace(/\s*\(.*\)\s*$/, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AccountCard({ account }: AccountCardProps) {
  const price =
    typeof account.monthlyPrice === "string"
      ? parseFloat(account.monthlyPrice)
      : account.monthlyPrice;

  const displayName = account.linkedinName.replace(/\s*\(.*\)\s*$/, "");
  const initials = getInitials(account.linkedinName);
  const ageYears = account.accountAgeMonths ? Math.floor(account.accountAgeMonths / 12) : null;

  return (
    <Link
      href={`/account/${account.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden"
          style={{ background: getAvatarColor(account.linkedinName) }}
        >
          {account.profilePhotoUrl ? (
            <img
              src={account.profilePhotoUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-[15px] truncate">{displayName}</div>
          {account.linkedinHeadline ? (
            <div className="text-[13px] text-gray-500 truncate">{account.linkedinHeadline}</div>
          ) : account.location ? (
            <div className="text-[13px] text-gray-500 truncate">{account.location}</div>
          ) : null}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {account.connectionCount > 0 && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="font-semibold text-[15px] text-gray-900">{formatNumber(account.connectionCount)}</div>
            <div className="text-[11px] text-gray-400">Connections</div>
          </div>
        )}
        {ageYears && ageYears > 0 ? (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="font-semibold text-[15px] text-gray-900">{ageYears}+ yrs</div>
            <div className="text-[11px] text-gray-400">Account age</div>
          </div>
        ) : null}
        {account.hasSalesNav && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="font-semibold text-[15px] text-gray-900">SN</div>
            <div className="text-[11px] text-gray-400">Sales Nav included</div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {account.industry && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            {account.industry}
          </span>
        )}
        {account.location && account.linkedinHeadline && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            {account.location}
          </span>
        )}
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">{formatCurrency(price)}</span>
          <span className="text-[13px] text-gray-400">/month</span>
        </div>
        <span className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors">
          View Profile
        </span>
      </div>
    </Link>
  );
}
