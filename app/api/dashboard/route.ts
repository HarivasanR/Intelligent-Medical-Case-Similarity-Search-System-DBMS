import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoCases, demoSearchHistory } from "@/lib/demo-data";
import { getDatabaseDashboardStats } from "@/services/database-cases";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if ((process.env.DATA_MODE || "demo") === "demo") {
    const byCategory = Object.entries(demoCases.reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
    const diagnoses = Object.entries(demoCases.reduce<Record<string, number>>((acc, item) => { acc[item.diagnosis] = (acc[item.diagnosis] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,5);
    return NextResponse.json({ totalCases: demoCases.length, totalSearches: 184, searchesToday: 12, activeUsers: 8, byCategory, diagnoses, recentCases: demoCases.slice(0,5), recentSearches: demoSearchHistory });
  }

  try {
    const stats = await getDatabaseDashboardStats();
    const byCategory = Object.entries(stats.cases.reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
    const diagnoses = Object.entries(stats.cases.reduce<Record<string, number>>((acc, item) => { acc[item.diagnosis] = (acc[item.diagnosis] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,5);
    return NextResponse.json({
      totalCases: stats.totalCases,
      totalSearches: stats.totalSearches,
      searchesToday: stats.searchesToday,
      activeUsers: stats.activeUsers,
      byCategory,
      diagnoses,
      recentCases: stats.cases.slice(0, 5),
      recentSearches: [],
    });
  } catch (error) {
    console.error("Failed to fetch dashboard API stats:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
