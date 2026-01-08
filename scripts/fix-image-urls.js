const { PrismaClient } = require("@prisma/client");

async function fixImageUrls() {
    const prisma = new PrismaClient();

    try {
        // Actualizar las URLs de /images/books/ a /api/images/books/
        const result = await prisma.$executeRawUnsafe(`
      UPDATE "BookPage" 
      SET "imageUrl" = REPLACE("imageUrl", '/images/books/', '/api/images/books/') 
      WHERE "imageUrl" LIKE '/images/books/%'
    `);
    
    console.log("Filas actualizadas:", result);
    
    // Verificar las URLs actualizadas
    const pages = await prisma.bookPage.findMany({
            },
            take: 5
        });

        console.log("Ejemplo de URLs actualizadas:");
        pages.forEach(p => console.log(p.imageUrl));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixImageUrls();
