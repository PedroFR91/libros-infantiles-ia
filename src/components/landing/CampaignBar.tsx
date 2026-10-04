"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { FOUNDER_OFFER } from "@/lib/pricing";
import { useOffer } from "@/components/landing/useOffer";

/**
 * Franja superior: la campaña de temporada activa (texto de campaigns.ts) o,
 * si no hay campaña, el precio fundador mientras queden plazas. Si la API
 * falla o no hay nada activo, no se pinta.
 */
export function CampaignBar() {
  const offer = useOffer();
  if (!offer) return null;

  const { campaign, founder } = offer;
  const base =
    "block bg-secondary text-white text-center text-sm sm:text-[0.95rem] leading-snug px-4 py-2.5";

  if (campaign) {
    const content = (
      <>
        <span className='font-semibold'>{campaign.banner.replace(/ %/g, "\u00a0%")}</span>
        {campaign.landingPath && (
          <span className='inline-flex items-center gap-1 ml-2 underline underline-offset-2 whitespace-nowrap'>
            Ver más
            <ArrowRight className='w-4 h-4' aria-hidden />
          </span>
        )}
      </>
    );
    return campaign.landingPath ? (
      <Link href={campaign.landingPath} className={`${base} hover:bg-secondary-hover transition-colors`}>
        {content}
      </Link>
    ) : (
      <p className={base}>{content}</p>
    );
  }

  if (founder?.active && founder.remaining > 0) {
    return (
      <Link href='/#precios' className={`${base} hover:bg-secondary-hover transition-colors`}>
        <Sparkles className='inline w-4 h-4 mr-1.5 -mt-0.5 text-[#FFD9B8]' aria-hidden />
        <span className='font-semibold'>
          Precio fundador −{founder.percent}&nbsp;%
          <span className='hidden sm:inline'> en los {FOUNDER_OFFER.limit} primeros pedidos</span>
        </span>{" "}
        <span className='text-white/85 whitespace-nowrap'>· quedan {founder.remaining}</span>
      </Link>
    );
  }

  return null;
}
