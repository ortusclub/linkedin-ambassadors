"use client";

import { formatNumber } from "@/lib/utils";

interface LinkedInPreviewProps {
  name: string;
  headline: string | null;
  photoUrl: string | null;
  connectionCount: number;
  location: string | null;
  industry: string | null;
}

export function LinkedInPreview({
  name,
  headline,
  photoUrl,
  connectionCount,
  location,
  industry,
}: LinkedInPreviewProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Banner */}
      <div className="h-28 bg-gradient-to-r from-[#004182] to-[#0a66c2] relative" />

      {/* Profile photo */}
      <div className="px-6 -mt-14 relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gray-400 text-4xl font-bold text-white shadow-md">
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-6 pt-4 pb-6">
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        {headline && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{headline}</p>
        )}
        {location && (
          <p className="text-sm text-gray-500 mt-2">{location}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-[#0a66c2]">
            {formatNumber(connectionCount)} connections
          </span>
          {industry && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{industry}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
