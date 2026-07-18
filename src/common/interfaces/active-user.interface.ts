export interface IActiveUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export class ActiveUser implements IActiveUser {
  userId!: string;
  email!: string;
  role!: string;
  permissions!: string[];
}
