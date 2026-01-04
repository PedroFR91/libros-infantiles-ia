import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  // Check if user is admin
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/editor");
  }

  // Fetch admin data
  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        createdAt: true,
        _count: {
          select: { books: true, payments: true },
        },
      },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.book.count(),
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]),
  ]);

  const [totalUsers, totalBooks, totalPayments, revenueData] = stats;

  return (
    <AdminDashboard
      users={users}
      stats={{
        totalUsers,
        totalBooks,
        totalPayments,
        totalRevenue: (revenueData._sum.amount || 0) / 100,
      }}
    />
  );
}
