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
    score: number;
    reason?: string;
    suggestion?: string;
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

export class EmailValidatorService {

    static async validate(email: string): Promise<ValidationResult> {
        const result: ValidationResult = {
            email,
            isValid: false,
            status: 'unknown',
            score: 0,
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
        if (!rfcRegex.test(email)) {
            result.status = 'invalid';
            result.reason = 'Invalid Syntax (RFC-2822)';
            result.score = 0;
            return result;
        }
        result.details.syntax = true;
        result.score = 25; // Base score for valid syntax

        const [localPart, domain] = email.split('@');
        const lowerDomain = domain.toLowerCase();
        result.details.isGmail = ['gmail.com', 'googlemail.com'].includes(lowerDomain);

        // 2. Typo Detection
        if (TYPO_DOMAINS[lowerDomain]) {
            result.suggestion = `${localPart}@${TYPO_DOMAINS[lowerDomain]}`;
            result.reason = `Possible typo in domain: ${lowerDomain}`;
            result.score -= 10;
        }

        // 3. Reputation Check
        const tldMatch = lowerDomain.substring(lowerDomain.lastIndexOf('.'));
        if (HIGH_RISK_TLDS.has(tldMatch)) {
            result.details.reputation = 'low';
            result.score -= 20;
        } else if (lowerDomain.length < 5) {
            result.details.reputation = 'medium';
            result.score -= 10;
        }

        // Role-based check
        const roles = ['admin', 'support', 'info', 'sales', 'contact', 'webmaster', 'postmaster', 'hostmaster'];
        if (roles.includes(localPart.toLowerCase())) {
            result.details.isRoleBased = true;
        }

        // 4. Disposable Check
        if (disposableDomains.has(lowerDomain)) {
            result.status = 'risky' as any;
            result.reason = 'Disposable Domain';
            result.details.isDisposable = true;
            result.score = 5;
            return result;
        }

        try {
            // 5. DNS/MX Check
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                result.status = 'invalid';
                result.reason = 'No MX Records';
                result.score = Math.min(result.score, 10);
                return result;
            }
            result.details.mx = true;
            result.score += 25;

            // Sort MX records by priority
            const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
            const exchange = sortedMx[0].exchange;

            // 6. SMTP Connection Check (Real Mailbox)
            const smtpCheck = await this.checkSmtp(exchange, email, 'hello@example.com');

            if (smtpCheck.success) {
                result.details.smtp = true;
                result.isValid = true;
                result.status = 'valid';
                result.score += 30;

                // 7. Catch-All Detection
                const randomUser = `check${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const catchAllCheck = await this.checkSmtp(exchange, `${randomUser}@${domain}`, 'hello@example.com');

                if (catchAllCheck.success) {
                    result.details.isCatchAll = true;
                    result.status = 'risky';
                    result.reason = result.reason ? `${result.reason}, Catch-All` : 'Catch-All Domain';
                    result.score -= 10;
                } else {
                    result.score += 20; // Verified specific mailbox
                }

                if (result.details.isRoleBased) {
                    result.status = 'risky';
                    result.reason = result.reason ? `${result.reason}, Role Based` : 'Role Based Address';
                    result.score -= 10;
                }

            } else {
                // SMTP Failed
                if (smtpCheck.code && smtpCheck.code >= 500 && smtpCheck.code < 600) {
                    result.status = 'invalid';
                    result.reason = 'Mailbox does not exist (SMTP)';
                } else {
                    result.status = 'risky';
                    result.reason = 'SMTP Connection Failed/Unknown';
                    result.score += 15;
                }
            }

        } catch (error) {
            result.status = 'invalid';
            result.reason = 'DNS Lookup Failed';
        }

        // Final score normalization
        result.score = Math.min(Math.max(result.score, 0), 100);
        return result;
    }

    private static checkSmtp(mxHost: string, rcptTo: string, mailFrom: string): Promise<{ success: boolean; code?: number; message?: string }> {
        return new Promise((resolve) => {
            const socket = net.createConnection(25, mxHost);
            let step = 0;
            let success = false;
            let lastCode = 0;

            socket.setTimeout(4000); // 4s timeout

            socket.on('data', (data) => {
                const response = data.toString();
                const code = parseInt(response.substring(0, 3));
                lastCode = code;

                if (code >= 200 && code < 300) {
                    // Initial connection or successful command
                } else if (code >= 400) {
                    // Temporary failure or Permanent error
                    socket.end();
                    resolve({ success: false, code, message: response });
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
                    success = true;
                    socket.write('QUIT\r\n');
                    step++;
                    socket.end();
                    resolve({ success: true, code });
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                resolve({ success: false, message: err.message });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ success: false, message: 'Timeout' });
            });
        });
    }
}
