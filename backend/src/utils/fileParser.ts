import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';

export interface EmailRecord {
    email: string;
    first_name?: string;
    company_name?: string;
    [key: string]: any;
}

// Helper to normalize keys (e.g. "Company Name" -> "company_name")
const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '_');

export async function parseFile(filePath: string, originalname: string, mimeType: string): Promise<EmailRecord[]> {
    const records: EmailRecord[] = [];

    try {
        if (mimeType.includes('csv') || originalname.endsWith('.csv')) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row: any) => {
                        // Find email column
                        const values = Object.values(row);
                        const keys = Object.keys(row);

                        let email = '';
                        let first_name = '';
                        let company_name = '';

                        // Smart detection
                        keys.forEach((key, index) => {
                            const val = (row[key] || '').toString().trim();
                            const normKey = normalizeKey(key);

                            if (normKey.includes('email') || (val.includes('@') && !email)) {
                                if (val.includes('@')) email = val;
                            }
                            if (normKey.includes('name') || normKey.includes('first')) {
                                first_name = val;
                            }
                            if (normKey.includes('company')) {
                                company_name = val;
                            }
                        });

                        if (!email) {
                            // Fallback: search values
                            const found = values.find((v: any) => typeof v === 'string' && v.includes('@'));
                            if (found) email = found as string;
                        }

                        if (email) {
                            records.push({
                                email: email.trim(),
                                first_name,
                                company_name
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else if (mimeType.includes('sheet') || originalname.match(/\.xlsx?$/)) {
            const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true });

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' }); // Get objects

                for (const row of data) {
                    let email = '';
                    let first_name = '';
                    let company_name = '';

                    // Iterate keys
                    Object.keys(row).forEach(key => {
                        const val = (row[key] || '').toString().trim();
                        const normKey = normalizeKey(key);

                        if (normKey.includes('email') || (val.includes('@') && !email)) {
                            if (val.includes('@')) email = val;
                        }
                        if (normKey.includes('name') || normKey.includes('first')) first_name = val;
                        if (normKey.includes('company')) company_name = val;
                    });

                    if (email) {
                        records.push({
                            email: email.trim(),
                            first_name,
                            company_name
                        });
                    }
                }
            });
        } else {
            // Text file fallback
            const content = fs.readFileSync(filePath, 'utf-8');
            content.split(/\r?\n/).forEach(line => {
                if (line.includes('@')) records.push({ email: line.trim() });
            });
        }
    } catch (error) {
        console.error(`Error parsing file ${originalname}:`, error);
        throw error;
    }
    return records;
}
