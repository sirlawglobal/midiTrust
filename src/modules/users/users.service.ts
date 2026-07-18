import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { RolesService } from './roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationBuilder } from '../../common/utils/pagination.builder';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
  ) {}

  async createUser(dto: CreateUserDto, creatorEmail?: string) {
    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException({
        success: false,
        errorCode: ERROR_CODES.DUPLICATE_RESOURCE,
        message: `User account with email '${dto.email}' already exists.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure role exists
    await this.rolesService.getRoleById(dto.roleId);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const created = await this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      roleId: dto.roleId as unknown as any,
      department: dto.department,
      isActive: dto.isActive ?? true,
    });

    const user = await this.userRepository.findByIdWithRole(String(created._id));

    await this.auditService.logAction({
      action: 'STAFF_CREATED',
      userEmail: creatorEmail,
      resourceId: String(created._id),
      resourceType: 'User',
      newState: { email: created.email, firstName: created.firstName, lastName: created.lastName, roleId: created.roleId },
    });

    return user;
  }

  async getUsers(query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const { skip, limit: safeLimit } = PaginationBuilder.getSkipAndLimit(page, limit);

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.userRepository.find(filter, undefined, {
        skip,
        limit: safeLimit,
        sort: { createdAt: -1 },
        populate: 'roleId',
      }),
      this.userRepository.count(filter),
    ]);

    return {
      data,
      meta: PaginationBuilder.buildMeta(total, page, safeLimit),
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findByIdWithRole(id);
    if (!user) {
      throw new NotFoundException({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: `User with ID '${id}' not found.`,
        timestamp: new Date().toISOString(),
      });
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, updaterEmail?: string) {
    const user = await this.getUserById(id);
    if (dto.roleId) {
      await this.rolesService.getRoleById(dto.roleId);
    }

    const oldState = user.toObject();
    const updated = await this.userRepository.updateById(
      id,
      { ...dto, roleId: dto.roleId as unknown as any },
      { new: true, populate: 'roleId' },
    );

    await this.auditService.logAction({
      action: 'STAFF_UPDATED',
      userEmail: updaterEmail,
      resourceId: id,
      resourceType: 'User',
      oldState,
      newState: updated?.toObject(),
    });

    return updated;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, updaterEmail?: string) {
    const user = await this.getUserById(id);
    const oldState = user.toObject();

    const updated = await this.userRepository.updateById(
      id,
      { isActive: dto.isActive },
      { new: true, populate: 'roleId' },
    );

    await this.auditService.logAction({
      action: dto.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
      userEmail: updaterEmail,
      resourceId: id,
      resourceType: 'User',
      oldState,
      newState: updated?.toObject(),
    });

    return updated;
  }

  async deleteUser(id: string, deleterEmail?: string) {
    const user = await this.getUserById(id);
    await this.userRepository.deleteById(id);

    await this.auditService.logAction({
      action: 'STAFF_DELETED',
      userEmail: deleterEmail,
      resourceId: id,
      resourceType: 'User',
      oldState: user.toObject(),
    });

    return { message: `Staff user '${user.email}' has been permanently deleted.` };
  }

  async updateLastLogin(id: string) {
    await this.userRepository.updateById(id, { lastLoginAt: new Date() });
  }

  async findByEmailWithPassword(email: string) {
    return this.userRepository.findByEmail(email, true);
  }
}
