import { EmailValidatorService } from './services/validator';

async function test(email: string) {
    console.log(`\n🔍 Testing validation for: ${email}`);
    console.log('--------------------------------------------------');

    try {
        const result = await EmailValidatorService.validate(email);
        console.log('✅ Result:', JSON.stringify(result, null, 2));

        if (result.isValid) {
            console.log('\n[SUCCESS] The email is VALID.');
        } else {
            console.log(`\n[FAILED] The email is ${result.status.toUpperCase()}. Reason: ${result.reason}`);
        }
    } catch (err) {
        console.error('❌ Error during validation:', err);
    }
}

// Get email from command line or use a default
const emailToTest = process.argv[2] || 'test@gmail.com';
test(emailToTest);
