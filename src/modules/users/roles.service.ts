import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoleRepository } from './repositories/role.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationBuilder } from '../../common/utils/pagination.builder';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly auditService: AuditService,
  ) {}

  async createRole(dto: CreateRoleDto, creatorEmail?: string) {
    const existing = await this.roleRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException({
        success: false,
        errorCode: ERROR_CODES.DUPLICATE_RESOURCE,
        message: `Role with name '${dto.name}' already exists.`,
        timestamp: new Date().toISOString(),
      });
    }

    const role = await this.roleRepository.create({
      name: dto.name.toUpperCase(),
      description: dto.description,
      permissions: dto.permissions,
      isSystemRole: dto.isSystemRole ?? false,
    });

    await this.auditService.logAction({
      action: 'ROLE_CREATED',
      userEmail: creatorEmail,
      resourceId: String(role._id),
      resourceType: 'Role',
      newState: role.toObject(),
    });

    return role;
  }

  async getRoles(query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const { skip, limit: safeLimit } = PaginationBuilder.getSkipAndLimit(page, limit);

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.roleRepository.find(filter, undefined, { skip, limit: safeLimit, sort: { name: 1 } }),
      this.roleRepository.count(filter),
    ]);

    return {
      data,
      meta: PaginationBuilder.buildMeta(total, page, safeLimit),
    };
  }

  async getRoleById(id: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException({
        success: false,
        errorCode: ERROR_CODES.NOT_FOUND,
        message: `Role with ID '${id}' not found.`,
        timestamp: new Date().toISOString(),
      });
    }
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto, updaterEmail?: string) {
    const role = await this.getRoleById(id);
    if (role.isSystemRole && dto.name && dto.name.toUpperCase() !== role.name) {
      throw new BadRequestException({
        success: false,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot rename system-defined roles.',
        timestamp: new Date().toISOString(),
      });
    }

    const oldState = role.toObject();
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.name) {
      updateData.name = dto.name.toUpperCase();
    }

    const updated = await this.roleRepository.updateById(id, updateData);

    await this.auditService.logAction({
      action: 'ROLE_UPDATED',
      userEmail: updaterEmail,
      resourceId: id,
      resourceType: 'Role',
      oldState,
      newState: updated?.toObject(),
    });

    return updated;
  }

  async deleteRole(id: string, deleterEmail?: string) {
    const role = await this.getRoleById(id);
    if (role.isSystemRole) {
      throw new BadRequestException({
        success: false,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot delete system-defined roles.',
        timestamp: new Date().toISOString(),
      });
    }

    await this.roleRepository.deleteById(id);

    await this.auditService.logAction({
      action: 'ROLE_DELETED',
      userEmail: deleterEmail,
      resourceId: id,
      resourceType: 'Role',
      oldState: role.toObject(),
    });

    return { message: `Role '${role.name}' has been successfully deleted.` };
  }
}
