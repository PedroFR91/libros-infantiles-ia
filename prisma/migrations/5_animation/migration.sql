-- Cuento animado: vídeo por página y estado de la animación del libro
ALTER TABLE "BookPage" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN "animationStatus" TEXT;
ALTER TABLE "Book" ADD COLUMN "animatedAt" TIMESTAMP(3);
