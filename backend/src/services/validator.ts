import * as emailValidator from 'email-validator';
import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// List of disposable domains (normally would be loaded from a file or DB)
const disposableDomains = new Set(['tempmail.com', 'throwawaymail.com', 'mailinator.com', 'guerrillamail.com', 'yopmail.com']);

export interface ValidationResult {
    email: string;
    isValid: boolean;
    status: 'valid' | 'invalid' | 'risky' | 'unknown';
    subStatus: string;
    score: number;
    reason?: string;
    suggestion?: string;
    freeEmail: boolean;
    didYouMean: string;
    account: string;
    domain: string;
    domainAgeDays: number | null;
    smtpProvider: string;
    mxFound: boolean;
    mxRecord: string | null;
    firstName: string;
    lastName: string;
    // Additional diagnostics
    plusAddressed: boolean;
    localPartLength: number;
    domainLength: number;
    tld: string;
    hasUnicode: boolean;
    isCorporateDomain: boolean;
    mxCount: number;
    smtpResponseCode: number | null;
    riskFlags: string[];
    details: {
        syntax: boolean;
        mx: boolean;
        smtp: boolean;
        isDisposable: boolean;
        isCatchAll: boolean;
        isRoleBased: boolean;
        isGmail: boolean;
        reputation: 'high' | 'medium' | 'low';
    };
}

const TYPO_DOMAINS: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'msn.com': 'msn.com',
    'icloud.com': 'icloud.com'
};

const HIGH_RISK_TLDS = new Set(['.xyz', '.top', '.win', '.icu', '.party', '.bid', '.date']);
const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com',
    'hotmail.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'proton.me',
    'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com'
]);
// Default to strict mailbox verification unless explicitly disabled.
const ENABLE_SMTP_CHECK = process.env.ENABLE_SMTP_CHECK !== 'false';
// Catch-all probing is expensive/noisy; keep disabled unless explicitly enabled.
const ENABLE_CATCH_ALL_CHECK = process.env.ENABLE_CATCH_ALL_CHECK === 'true';

function inferSmtpProvider(mxHost: string | null): string {
    if (!mxHost) return 'unknown';
    const lower = mxHost.toLowerCase();
    if (lower.includes('google.com') || lower.includes('googlemail.com')) return 'google';
    if (lower.includes('outlook.com') || lower.includes('protection.outlook.com') || lower.includes('hotmail.com')) return 'microsoft';
    if (lower.includes('yahoodns.net') || lower.includes('yahoo.com')) return 'yahoo';
    if (lower.includes('zoho.com')) return 'zoho';
    if (lower.includes('secureserver.net')) return 'godaddy';
    if (lower.includes('mailgun.org')) return 'mailgun';
    if (lower.includes('amazonses.com')) return 'amazon_ses';
    return lower.split('.').slice(-2).join('.');
}

function extractNameParts(localPart: string): { firstName: string; lastName: string } {
    const cleaned = localPart.replace(/\+/g, '.');
    const chunks = cleaned
        .split(/[._-]+/)
        .map(part => part.replace(/\d+/g, '').trim())
        .filter(Boolean);
    if (chunks.length === 0) return { firstName: 'Unknown', lastName: 'Unknown' };
    if (chunks.length === 1) return { firstName: chunks[0], lastName: 'Unknown' };
    return { firstName: chunks[0], lastName: chunks[chunks.length - 1] };
}

export class EmailValidatorService {

    static async validate(email: string): Promise<ValidationResult> {
        const normalizedEmail = email.trim().toLowerCase();
        const [localPartRaw = '', domainRaw = ''] = normalizedEmail.split('@');
        const tld = domainRaw.includes('.') ? `.${domainRaw.split('.').pop()}` : '';
        const { firstName, lastName } = extractNameParts(localPartRaw);

        const result: ValidationResult = {
            email: normalizedEmail,
            isValid: false,
            status: 'unknown',
            subStatus: 'none',
            score: 0,
            freeEmail: FREE_EMAIL_DOMAINS.has(domainRaw),
            didYouMean: 'Unknown',
            account: localPartRaw || 'Unknown',
            domain: domainRaw || 'Unknown',
            domainAgeDays: null, // Needs WHOIS/RDAP service; not available in local-only checks.
            smtpProvider: 'unknown',
            mxFound: false,
            mxRecord: null,
            firstName,
            lastName,
            plusAddressed: localPartRaw.includes('+'),
            localPartLength: localPartRaw.length,
            domainLength: domainRaw.length,
            tld,
            hasUnicode: /[^\x00-\x7F]/.test(normalizedEmail),
            isCorporateDomain: !FREE_EMAIL_DOMAINS.has(domainRaw),
            mxCount: 0,
            smtpResponseCode: null,
            riskFlags: [],
            details: {
                syntax: false,
                mx: false,
                smtp: false,
                isDisposable: false,
                isCatchAll: false,
                isRoleBased: false,
                isGmail: false,
                reputation: 'high'
            }
        };

        // 1. Syntax Check (RFC standards)
        // More robust RFC compliant regex
        const rfcRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!rfcRegex.test(normalizedEmail)) {
            result.status = 'invalid';
            result.subStatus = 'invalid_syntax';
            result.reason = 'Invalid Syntax (RFC-2822)';
            result.score = 0;
            result.riskFlags.push('invalid_syntax');
            return result;
        }
        result.details.syntax = true;
        result.score = 25; // Base score for valid syntax

        const localPart = localPartRaw;
        const domain = domainRaw;
        const lowerDomain = domain.toLowerCase();
        result.details.isGmail = ['gmail.com', 'googlemail.com'].includes(lowerDomain);

        // 2. Typo Detection
        if (TYPO_DOMAINS[lowerDomain]) {
            result.suggestion = `${localPart}@${TYPO_DOMAINS[lowerDomain]}`;
            result.didYouMean = result.suggestion;
            result.subStatus = 'possible_typo';
            result.reason = `Possible typo in domain: ${lowerDomain}`;
            result.score -= 10;
            result.riskFlags.push('possible_typo');
        }

        // 3. Reputation Check
        const tldMatch = lowerDomain.substring(lowerDomain.lastIndexOf('.'));
        if (HIGH_RISK_TLDS.has(tldMatch)) {
            result.details.reputation = 'low';
            result.score -= 20;
            result.riskFlags.push('high_risk_tld');
        } else if (lowerDomain.length < 5) {
            result.details.reputation = 'medium';
            result.score -= 10;
            result.riskFlags.push('short_domain');
        }

        // Role-based check
        const roles = ['admin', 'support', 'info', 'sales', 'contact', 'webmaster', 'postmaster', 'hostmaster'];
        if (roles.includes(localPart.toLowerCase())) {
            result.details.isRoleBased = true;
            result.riskFlags.push('role_based');
        }

        // 4. Disposable Check
        if (disposableDomains.has(lowerDomain)) {
            result.status = 'risky' as any;
            result.subStatus = 'disposable_domain';
            result.reason = 'Disposable Domain';
            result.details.isDisposable = true;
            result.score = 5;
            result.riskFlags.push('disposable');
            return result;
        }

        try {
            // 5. DNS/MX Check
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                result.status = 'invalid';
                result.subStatus = 'no_mx_records';
                result.reason = 'No MX Records';
                result.score = Math.min(result.score, 10);
                result.riskFlags.push('no_mx_records');
                return result;
            }
            result.details.mx = true;
            result.mxFound = true;
            result.mxCount = mxRecords.length;
            result.score += 25;

            // Sort MX records by priority
            const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
            const exchange = sortedMx[0].exchange;
            result.mxRecord = exchange;
            result.smtpProvider = inferSmtpProvider(exchange);

            // Pragmatic default mode for bulk uploads:
            // MX + syntax are enough for "valid", while SMTP remains optional due to provider/network blocking.
            if (!ENABLE_SMTP_CHECK) {
                result.details.smtp = false;
                result.isValid = true;
                result.status = 'valid';
                result.subStatus = 'mx_verified';
                result.reason = result.reason || 'Syntax + MX verified';
                result.score += 20;
                result.riskFlags.push('smtp_skipped');
                result.score = Math.min(Math.max(result.score, 0), 100);
                return result;
            }

            // 6. SMTP Connection Check (Real Mailbox)
            const smtpCheck = await this.checkSmtp(exchange, email, 'hello@example.com');
            result.smtpResponseCode = smtpCheck.code ?? null;

            if (smtpCheck.success) {
                result.details.smtp = true;
                result.isValid = true;
                result.status = 'valid';
                result.subStatus = 'none';
                result.score += 30;

                // 7. Catch-All Detection
                if (ENABLE_CATCH_ALL_CHECK) {
                    const randomUser = `check${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    const catchAllCheck = await this.checkSmtp(exchange, `${randomUser}@${domain}`, 'hello@example.com');

                    if (catchAllCheck.success) {
                        result.details.isCatchAll = true;
                        result.status = 'risky';
                        result.subStatus = 'catch_all';
                        result.reason = result.reason ? `${result.reason}, Catch-All` : 'Catch-All Domain';
                        result.score -= 10;
                        result.riskFlags.push('catch_all');
                    } else {
                        result.score += 20; // Verified specific mailbox
                    }
                }

                // Role-based addresses are retained as valid if mailbox checks pass.

            } else {
                // SMTP Failed
                if (smtpCheck.code && smtpCheck.code >= 500 && smtpCheck.code < 600) {
                    result.status = 'invalid';
                    result.subStatus = 'mailbox_not_found';
                    result.reason = 'Mailbox does not exist (SMTP)';
                    result.riskFlags.push('smtp_hard_bounce');
                } else {
                    result.status = 'risky';
                    result.subStatus = 'smtp_unverified';
                    result.reason = 'SMTP Connection Failed/Unknown';
                    result.score += 15;
                    result.riskFlags.push('smtp_soft_fail');
                }
            }

        } catch (error) {
            result.status = 'risky';
            result.subStatus = 'dns_lookup_failed';
            result.reason = 'DNS Lookup Failed (Transient/Network)';
            result.riskFlags.push('dns_lookup_failed');
        }

        // Final score normalization
        result.score = Math.min(Math.max(result.score, 0), 100);
        return result;
    }

    private static checkSmtp(mxHost: string, rcptTo: string, mailFrom: string): Promise<{ success: boolean; code?: number; message?: string }> {
        return new Promise((resolve) => {
            const socket = net.createConnection(25, mxHost);
            let step = 0;
            let settled = false;

            const finalize = (payload: { success: boolean; code?: number; message?: string }) => {
                if (settled) return;
                settled = true;
                try {
                    socket.end();
                } catch { }
                resolve(payload);
            };

            socket.setTimeout(4000); // 4s timeout

            socket.on('data', (data) => {
                const response = data.toString();
                const code = parseInt(response.substring(0, 3));

                if (code >= 200 && code < 300) {
                    // Initial connection or successful command
                } else if (code >= 400) {
                    // Temporary failure or Permanent error
                    finalize({ success: false, code, message: response });
                    return;
                }

                if (step === 0 && response.includes('220')) {
                    socket.write(`EHLO ${mailFrom.split('@')[1]}\r\n`);
                    step++;
                } else if (step === 1) { // After EHLO
                    socket.write(`MAIL FROM:<${mailFrom}>\r\n`);
                    step++;
                } else if (step === 2) { // After MAIL FROM
                    socket.write(`RCPT TO:<${rcptTo}>\r\n`);
                    step++;
                } else if (step === 3) { // After RCPT TO
                    // If we get here with a 250, the email arguably exists.
                    socket.write('QUIT\r\n');
                    step++;
                    finalize({ success: true, code });
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                finalize({ success: false, message: err.message });
            });

            socket.on('timeout', () => {
                socket.destroy();
                finalize({ success: false, message: 'Timeout' });
            });

            // Some servers close abruptly without a final SMTP code.
            socket.on('close', () => {
                finalize({ success: false, message: 'Connection closed before SMTP response' });
            });
        });
    }
}
