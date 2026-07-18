export enum PermissionEnum {
  // User & Staff management
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  ROLES_MANAGE = 'roles:manage',

  // Patient management
  PATIENTS_CREATE = 'patients:create',
  PATIENTS_READ = 'patients:read',
  PATIENTS_UPDATE = 'patients:update',

  // Billing & Invoices
  INVOICES_CREATE = 'invoices:create',
  INVOICES_READ = 'invoices:read',
  INVOICES_UPDATE = 'invoices:update',
  INVOICES_CANCEL = 'invoices:cancel',
  VIRTUAL_ACCOUNTS_GENERATE = 'virtual_accounts:generate',

  // Payments & Receipts
  PAYMENTS_READ = 'payments:read',
  RECEIPTS_READ = 'receipts:read',
  RECEIPTS_RESEND = 'receipts:resend',

  // Verification & Pharmacy
  RECEIPT_VERIFY = 'receipt:verify',
  VERIFICATION_HISTORY_READ = 'verification_history:read',

  // Dashboard & Analytics
  DASHBOARD_READ = 'dashboard:read',

  // Audit Logs & Settings
  AUDIT_LOGS_READ = 'audit_logs:read',
  SETTINGS_MANAGE = 'settings:manage',
}
