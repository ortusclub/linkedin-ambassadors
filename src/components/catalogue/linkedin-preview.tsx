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
      <div className="h-24 bg-gradient-to-r from-[#004182] to-[#0a66c2] relative" />

      {/* Profile photo */}
      <div className="px-4 -mt-12 relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-300 text-3xl font-bold text-white shadow">
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-2 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        {headline && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{headline}</p>
        )}
        {location && (
          <p className="text-xs text-gray-500 mt-1">{location}</p>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-[#0a66c2] font-medium">
          <span>{formatNumber(connectionCount)} connections</span>
        </div>

        {/* Fake LinkedIn buttons */}
        <div className="mt-3 flex gap-2">
          <div className="rounded-full bg-[#0a66c2] px-4 py-1.5 text-xs font-semibold text-white">
            Connect
          </div>
          <div className="rounded-full border border-[#0a66c2] px-4 py-1.5 text-xs font-semibold text-[#0a66c2]">
            Message
          </div>
          <div className="rounded-full border border-gray-400 px-3 py-1.5 text-xs font-semibold text-gray-600">
            More
          </div>
        </div>

        {/* Fake about section */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-900">About</p>
          <div className="mt-1 space-y-1">
            <div className="h-2.5 bg-gray-100 rounded w-full" />
            <div className="h-2.5 bg-gray-100 rounded w-11/12" />
            <div className="h-2.5 bg-gray-100 rounded w-4/5" />
          </div>
        </div>

        {/* Fake experience */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-900">Experience</p>
          <div className="mt-2 flex items-start gap-2">
            <div className="h-8 w-8 rounded bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-gray-100 rounded w-3/4" />
              <div className="h-2 bg-gray-50 rounded w-1/2" />
            </div>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <div className="h-8 w-8 rounded bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-gray-100 rounded w-2/3" />
              <div className="h-2 bg-gray-50 rounded w-2/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
