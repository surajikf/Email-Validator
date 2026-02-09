import axios from 'axios';

interface SendEmailParams {
    to: { email: string; name?: string }[];
    subject: string;
    params?: Record<string, any>;
    templateId?: number;
}

export class BrevoService {
    static async sendEmail(data: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const apiKey = process.env.BREVO_API_KEY;
        const sender = {
            name: process.env.BREVO_SENDER_NAME || 'Tina Gupta',
            email: process.env.BREVO_SENDER_EMAIL || 'tina.gupta@iknowai.in'
        };

        if (!apiKey) {
            console.error('[BrevoService] API Key missing');
            return { success: false, error: 'API Key missing' };
        }

        console.log(`[BrevoService] Sending email from: "${sender.name}" <${sender.email}>`);

        try {
            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: sender,
                    to: data.to,
                    subject: data.subject,
                    templateId: data.templateId || 255, // Default from n8n logic
                    params: data.params
                },
                {
                    headers: {
                        'api-key': apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[BrevoService] Email sent to ${data.to[0].email}:`, response.data);
            return { success: true, messageId: response.data.messageId };
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error('[BrevoService] Failed to send email:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }
}
