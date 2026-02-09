import { supabase } from '../lib/supabase';

export class DashboardService {
    static async getSummaryStats() {
        if (!supabase) return { total_validated: 0, total_valid: 0, total_sent: 0, total_pending: 0 };

        const [validated, valid, sent] = await Promise.all([
            supabase.from('validated_emails').select('email', { count: 'exact', head: true }),
            supabase.from('validated_emails').select('email', { count: 'exact', head: true }).eq('status', 'valid'),
            supabase.from('validated_emails').select('email', { count: 'exact', head: true }).not('sent_at', 'is', null)
        ]);

        const total_validated = validated.count || 0;
        const total_valid = valid.count || 0;
        const total_sent = sent.count || 0;
        const total_pending = total_valid - total_sent;

        return {
            total_validated,
            total_valid,
            total_sent,
            total_pending: total_pending < 0 ? 0 : total_pending
        };
    }

    static async getDailyStats() {
        if (!supabase) return [];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('validated_emails')
            .select('sent_at')
            .not('sent_at', 'is', null)
            .gte('sent_at', thirtyDaysAgo.toISOString());

        if (error) throw error;

        const dailyMap: Record<string, number> = {};

        data.forEach(record => {
            if (!record.sent_at) return;
            const date = record.sent_at.split('T')[0];
            dailyMap[date] = (dailyMap[date] || 0) + 1;
        });

        return Object.entries(dailyMap)
            .map(([date, count]) => ({ date, sent: count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    static async getDatabaseView(page: number, limit: number, status?: string, search?: string) {
        if (!supabase) return { records: [], totalCount: 0, page, limit, message: 'Database not configured' };

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        let query = supabase
            .from('validated_emails')
            .select('*', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.ilike('email', `%${search}%`);
        }

        const { data, error, count } = await query
            .order('validated_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        return {
            records: data,
            totalCount: count || 0,
            page,
            limit
        };
    }
}
