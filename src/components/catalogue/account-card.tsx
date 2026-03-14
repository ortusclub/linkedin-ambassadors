"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function AccountCard({ account }: AccountCardProps) {
  const price = typeof account.monthlyPrice === "string"
    ? parseFloat(account.monthlyPrice)
    : account.monthlyPrice;

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
          {account.profilePhotoUrl ? (
            <img
              src={account.profilePhotoUrl}
              alt={account.linkedinName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-400">
              {account.linkedinName.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{account.linkedinName}</h3>
          {account.linkedinHeadline && (
            <p className="mt-1 text-sm text-gray-600 truncate">{account.linkedinHeadline}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="info">{formatNumber(account.connectionCount)} connections</Badge>
        {account.industry && <Badge>{account.industry}</Badge>}
        {account.location && <Badge>{account.location}</Badge>}
        {account.accountAgeMonths && (
          <Badge>
            {account.accountAgeMonths >= 12
              ? `${Math.floor(account.accountAgeMonths / 12)}y on LinkedIn`
              : `${account.accountAgeMonths}mo on LinkedIn`}
          </Badge>
        )}
        {account.hasSalesNav && <Badge variant="success">Sales Navigator</Badge>}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(price)}<span className="text-sm font-normal text-gray-500">/mo</span>
        </span>
        <Link href={`/account/${account.id}`}>
          <Button size="sm">Rent This Account</Button>
        </Link>
      </div>
    </div>
  );
}
