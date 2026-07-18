import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/enums/permission.enum';
import { MongoIdValidationPipe } from '../../common/pipes/mongo-id-validation.pipe';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new patient' })
  @ApiResponse({ status: 201, description: 'Patient successfully created.' })
  @ApiResponse({ status: 409, description: 'Patient with this phone number already exists.' })
  @Permissions(PermissionEnum.PATIENTS_CREATE)
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all patients' })
  @ApiResponse({ status: 200, description: 'List of patients.' })
  @Permissions(PermissionEnum.PATIENTS_READ)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.patientsService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a patient by ID' })
  @ApiResponse({ status: 200, description: 'The patient details.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @Permissions(PermissionEnum.PATIENTS_READ)
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a patient by ID' })
  @ApiResponse({ status: 200, description: 'Patient successfully updated.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @Permissions(PermissionEnum.PATIENTS_UPDATE)
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, updatePatientDto);
  }
}
