import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PatientsRepository } from './patients.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient } from './schemas/patient.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private readonly patientsRepository: PatientsRepository) {}

  async create(createPatientDto: CreatePatientDto): Promise<Patient> {
    // Check if phone number is already registered
    const existing = await this.patientsRepository.findByPhone(createPatientDto.phone);
    if (existing) {
      throw new ConflictException(`A patient with phone number ${createPatientDto.phone} already exists.`);
    }

    // Generate unique Hospital ID: PAT-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.patientsRepository.countByYear(currentYear);
    const sequentialNumber = (countThisYear + 1).toString().padStart(6, '0');
    const hospitalId = `PAT-${currentYear}-${sequentialNumber}`;

    const newPatient = await this.patientsRepository.create({
      ...createPatientDto,
      hospitalId,
      isActive: true,
    });

    this.logger.log(`Patient created: ${hospitalId}`);
    return newPatient;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    return this.patientsRepository.findPaginated(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientsRepository.findById(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.patientsRepository.updateById(id, updatePatientDto);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }
}
