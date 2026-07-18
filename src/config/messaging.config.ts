import { registerAs } from '@nestjs/config';

export default registerAs('messaging', () => ({
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v20.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '123456789012345',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAXXXXXXXXXXXXX',
    defaultTemplateNamespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE || 'meditrust_receipts',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'termii', // 'termii' or 'twilio'
    termii: {
      apiKey: process.env.TERMII_API_KEY || 'TLXXXXXXXXXXXXX',
      baseUrl: process.env.TERMII_BASE_URL || 'https://api.ng.termii.com',
      senderId: process.env.TERMII_SENDER_ID || 'MediTrust',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXX',
      authToken: process.env.TWILIO_AUTH_TOKEN || 'XXXXXXXXXXXXX',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890',
    },
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'brevo',
    from: process.env.EMAIL_FROM || 'akanjiayobami71@gmail.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Vitafoam',
    brevo: {
      apiKey: process.env.BREVO_API_KEY || '',
    },
  },
}));
