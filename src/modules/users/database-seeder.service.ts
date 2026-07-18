import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { RoleEnum } from '../../common/enums/role.enum';
import { PermissionEnum } from '../../common/enums/permission.enum';

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seedRoles();
      await this.seedSuperAdmin();
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed during database seeding: ${errMessage}`);
    }
  }

  private async seedRoles() {
    const systemRoles = [
      {
        name: RoleEnum.ADMIN,
        description: 'Administrator with unrestricted access to all hospital modules',
        permissions: Object.values(PermissionEnum),
        isSystemRole: true,
      },
      {
        name: RoleEnum.STAFF,
        description: 'General hospital staff (reception, billing, pharmacy, security)',
        permissions: [
          PermissionEnum.PATIENTS_CREATE,
          PermissionEnum.PATIENTS_READ,
          PermissionEnum.PATIENTS_UPDATE,
          PermissionEnum.INVOICES_CREATE,
          PermissionEnum.INVOICES_READ,
          PermissionEnum.INVOICES_UPDATE,
          PermissionEnum.INVOICES_CANCEL,
          PermissionEnum.VIRTUAL_ACCOUNTS_GENERATE,
          PermissionEnum.PAYMENTS_READ,
          PermissionEnum.RECEIPTS_READ,
          PermissionEnum.RECEIPTS_RESEND,
          PermissionEnum.RECEIPT_VERIFY,
          PermissionEnum.VERIFICATION_HISTORY_READ,
          PermissionEnum.DASHBOARD_READ,
        ],
        isSystemRole: true,
      },
    ];

    for (const roleDef of systemRoles) {
      const existing = await this.roleRepository.findByName(roleDef.name);
      if (!existing) {
        await this.roleRepository.create(roleDef);
        this.logger.log(`[Seeder] Created system role: ${roleDef.name}`);
      } else {
        // Keep permissions updated on boot for system roles
        await this.roleRepository.updateById(String(existing._id), {
          permissions: roleDef.permissions,
          description: roleDef.description,
        });
      }
    }
  }

  private async seedSuperAdmin() {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@meditrust-hospital.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecretAdmin2026!';

    const existing = await this.userRepository.findByEmail(adminEmail);
    if (!existing) {
      const superAdminRole = await this.roleRepository.findByName(RoleEnum.ADMIN);
      if (!superAdminRole) {
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await this.userRepository.create({
        email: adminEmail.toLowerCase(),
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+2348000000000',
        roleId: superAdminRole._id as unknown as any,
        department: 'EXECUTIVE_IT',
        isActive: true,
      });

      this.logger.log(`[Seeder] Created initial Super Admin account: ${adminEmail}`);
    }
  }
}
