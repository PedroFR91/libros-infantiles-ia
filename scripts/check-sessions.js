const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const sessions = await p.session.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          credits: true
        }
      }
    }
  });
  console.log(JSON.stringify(sessions, null, 2));
}

main().finally(() => p.$disconnect());
