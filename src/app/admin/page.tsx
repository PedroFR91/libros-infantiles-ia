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
  const [users, books, recentPayments, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        sessionId: true,
        credits: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { books: true, payments: true },
        },
      },
    }),
    prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        kidName: true,
        theme: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: { pages: true },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        status: true,
        creditsGranted: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.book.count(),
      prisma.book.count({ where: { status: "COMPLETED" } }),
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.user.aggregate({
        _sum: { credits: true },
      }),
    ]),
  ]);

  const [totalUsers, totalBooks, completedBooks, totalPayments, revenueData, creditsData] = stats;

  return (
    <AdminDashboard
      users={users}
      books={books}
      recentPayments={recentPayments}
      stats={{
        totalUsers,
        totalBooks,
        completedBooks,
        totalPayments,
        totalRevenue: (revenueData._sum.amount || 0) / 100,
        totalCreditsInSystem: creditsData._sum.credits || 0,
      }}
    />
  );
}
