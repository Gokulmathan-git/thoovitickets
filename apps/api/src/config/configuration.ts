export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiryAdmin: process.env.JWT_REFRESH_EXPIRY_ADMIN || '5h',
    refreshExpiryOrganiser: process.env.JWT_REFRESH_EXPIRY_ORGANISER || '12h',
    refreshExpiryCustomer: process.env.JWT_REFRESH_EXPIRY_CUSTOMER || '24h',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  },
  gmail: {
    user: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  },
});
