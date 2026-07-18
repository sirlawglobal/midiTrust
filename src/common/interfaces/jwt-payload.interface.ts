export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}
