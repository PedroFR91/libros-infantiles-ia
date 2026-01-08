const { PrismaClient } = require("@prisma/client");

async function clearPdfCache() {
    const prisma = new PrismaClient();

    try {
        const result = await prisma.book.updateMany({
            data: {
                digitalPdfUrl: null,
                printPdfUrl: null
            }
        });

        console.log("PDFs cacheados eliminados:", result.count);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearPdfCache();
