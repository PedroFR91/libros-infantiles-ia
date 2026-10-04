"use client";

import { useEffect, useState } from "react";

// Estado público de la oferta (GET /api/offer): precio fundador y campaña de
// temporada activa. Una sola petición por carga de página, compartida entre
// la franja superior y el hero.

export interface FounderState {
  active: boolean;
  remaining: number;
  percent: number;
}

export interface PublicCampaign {
  id: string;
  name: string;
  banner: string;
  discountPercent: number | null;
  appliesTo: string[];
  themes: { id: string; label: string; emoji: string }[];
  landingPath: string | null;
  printDeadline: string | null;
  bonus: { onProduct: "bundle"; credits: number; label: string } | null;
  endsAt: string;
}

export interface OfferState {
  founder: FounderState | null;
  campaign: PublicCampaign | null;
}

let pending: Promise<OfferState | null> | null = null;

function loadOffer(): Promise<OfferState | null> {
  if (!pending) {
    pending = fetch("/api/offer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<OfferState> | null) => {
        if (!data) return null;
        const f = data.founder;
        return {
          founder: f && typeof f.active === "boolean" ? f : null,
          campaign: data.campaign && typeof data.campaign.banner === "string" ? data.campaign : null,
        };
      })
      .catch(() => null);
  }
  return pending;
}

/** null mientras carga o si la API falla (no se muestra nada de oferta) */
export function useOffer(): OfferState | null {
  const [offer, setOffer] = useState<OfferState | null>(null);
  useEffect(() => {
    let alive = true;
    loadOffer().then((data) => {
      if (alive) setOffer(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return offer;
}
