-- Cuento narrado: audio por página, música y fecha de narración completa
ALTER TABLE "BookPage" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN "musicTrack" TEXT;
ALTER TABLE "Book" ADD COLUMN "narratedAt" TIMESTAMP(3);
