/**
 * Script para resetear libros atascados en estado GENERATING.
 * Ejecutar periódicamente con cron o manualmente: node scripts/fix-stuck-books.js
 * 
 * Un libro se considera "atascado" si lleva más de 15 minutos en GENERATING.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STUCK_THRESHOLD_MINUTES = 15;

async function fixStuckBooks() {
    const threshold = new Date(
        Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000
    );

    console.log(
        `Buscando libros en GENERATING anteriores a ${threshold.toISOString()}...`
    );

    const stuckBooks = await prisma.book.findMany({
        where: {
            status: "GENERATING",
            updatedAt: {
                lt: threshold,
            },
        },
        select: {
            id: true,
            title: true,
            kidName: true,
            updatedAt: true,
            user: {
                select: { email: true, id: true },
            },
            _count: {
                select: { pages: true },
            },
        },
    });

    if (stuckBooks.length === 0) {
        console.log("✅ No hay libros atascados.");
        return;
    }

    console.log(`⚠️  Encontrados ${stuckBooks.length} libros atascados:\n`);

    for (const book of stuckBooks) {
        const minutesStuck = Math.round(
            (Date.now() - new Date(book.updatedAt).getTime()) / 60000
        );

        console.log(
            `  📖 ${book.id} - "${book.kidName}" - ${minutesStuck}min atascado - ${book._count.pages} páginas - usuario: ${book.user.email || book.user.id}`
        );

        // Si tiene páginas, marcarlo como ERROR (la generación falló parcialmente)
        // Si no tiene páginas, volver a DRAFT (se puede reintentar)
        const newStatus = book._count.pages > 0 ? "ERROR" : "DRAFT";

        await prisma.book.update({
            where: { id: book.id },
            data: { status: newStatus },
        });

        console.log(`    → Cambiado a ${newStatus}`);
    }

    console.log(`\n✅ ${stuckBooks.length} libros reseteados.`);
}

fixStuckBooks()
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
