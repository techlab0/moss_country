import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createActionRequiredDashboardHandler, type ActionRequiredTable } from '@/lib/actionRequiredDashboard';

export const dynamic = 'force-dynamic';

async function countByStatuses(table: ActionRequiredTable, statuses: string[]): Promise<number | null> {
  try {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('status', statuses);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error(`Action-required count failed (${table}):`, error);
    return null;
  }
}

const handleActionRequired = createActionRequiredDashboardHandler<NextRequest>({
  verifySession: verifyAdminSession,
  countByStatuses,
});

export async function GET(request: NextRequest) {
  const result = await handleActionRequired(request);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
