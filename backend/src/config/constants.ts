export const TYPO_DOMAINS: Record<string, string> = {
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

export const HIGH_RISK_TLDS = new Set(['.xyz', '.top', '.win', '.icu', '.party', '.bid', '.date']);

export const FREE_PROVIDERS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com',
    'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'mac.com', 'aol.com',
    'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com',
    'mail.com', 'gmx.com', 'fastmail.com'
]);
