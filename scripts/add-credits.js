const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // Get all users
        const users = await prisma.user.findMany();
        console.log('=== USUARIOS ===');
        console.log(JSON.stringify(users, null, 2));

        // Add 100 credits to all users (for testing)
        const updated = await prisma.user.updateMany({
            data: { credits: 100 }
        });
        console.log(`\n=== CRÉDITOS ACTUALIZADOS: ${updated.count} usuarios ahora tienen 100 créditos ===`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
