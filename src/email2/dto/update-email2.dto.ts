import { PartialType } from '@nestjs/mapped-types';
import { CreateEmail2Dto } from './create-email2.dto';

export class UpdateEmail2Dto extends PartialType(CreateEmail2Dto) {}
