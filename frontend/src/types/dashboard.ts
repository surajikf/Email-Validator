export interface SummaryStats {
    total_validated: number;
    total_valid: number;
    total_sent: number;
    total_pending: number;
}

export interface DailyStat {
    date: string;
    sent: number;
}
