import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import { User, UserSchema } from './schemas/user.schema';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { RolesService } from './roles.service';
import { UsersService } from './users.service';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';
import { DatabaseSeederService } from './database-seeder.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RolesController, UsersController],
  providers: [
    RoleRepository,
    UserRepository,
    RolesService,
    UsersService,
    DatabaseSeederService,
  ],
  exports: [RolesService, UsersService, UserRepository, RoleRepository],
})
export class UsersModule {}
