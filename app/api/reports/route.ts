import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ReportStatus, ReportType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";


export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");

    // Runtime type-checking instead of "as"
    const status = Object.values(ReportStatus).includes(statusParam as ReportStatus)
      ? (statusParam as ReportStatus)
      : null;

    const type = Object.values(ReportType).includes(typeParam as ReportType)
      ? (typeParam as ReportType)
      : null;

    // Build the where clause based on filters
    const where = {
      ...(status && { status }),
      ...(type && { type }),
    };

    // Add timeout and retry logic
    const reports = await Promise.race<Awaited<ReturnType<typeof prisma.report.findMany>>>(
      [
        prisma.report.findMany({
          where,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reportId: true,
            type: true,
            title: true,
            description: true,
            location: true,
            latitude: true,
            longitude: true,
            image: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 15000)
        ),
      ]
    );

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch reports:", error);

    // Ensure error is correctly typed
    if (error instanceof Error) {
      if ("code" in error) {
        const errorCode = error.code as string;

        if (errorCode === "P1001") {
          return NextResponse.json(
            { error: "Cannot connect to database. Please try again later." },
            { status: 503 }
          );
        }

        if (errorCode === "P2024") {
          return NextResponse.json(
            { error: "Database connection timeout. Please try again." },
            { status: 504 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  } finally {
    // Optional: Disconnect for serverless environments
    if (process.env.VERCEL) {
      await prisma.$disconnect();
    }
  }
}
