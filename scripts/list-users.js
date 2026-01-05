const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true, credits: true }
        });
        console.log('=== USUARIOS ===');
        console.log(JSON.stringify(users, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main();
