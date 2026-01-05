const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // Create or update admin user
        const adminEmail = 'admin@iconicospace.com';

        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                role: 'ADMIN',
                credits: 1000,
            },
            create: {
                email: adminEmail,
                name: 'Admin',
                role: 'ADMIN',
                credits: 1000,
                emailVerified: new Date(),
            },
        });

        console.log('✅ Admin user created/updated:');
        console.log(JSON.stringify(admin, null, 2));

    } finally {
        await prisma.$disconnect();
    }
}

main();
