import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { mockUser } from '../mockdata/users';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from './dto/update-financial-account.dto';
import { FinancialAccountsService } from './financial-accounts.service';

@ApiTags('financial-accounts')
@Controller('api/financial-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinancialAccountsController {
  constructor(private readonly financialAccountsService: FinancialAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new financial account' })
  create(@Body() createDto: CreateFinancialAccountDto, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.financialAccountsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all financial accounts' })
  findAll(@Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.financialAccountsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get financial account by id' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.financialAccountsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update financial account' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFinancialAccountDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.financialAccountsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete financial account' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = Number(req.user?.id ?? mockUser.id);
    return this.financialAccountsService.remove(id, userId);
  }
}
