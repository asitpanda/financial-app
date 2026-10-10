import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { CreateLockerEntityDto } from './dto/create-locker-entity.dto';
import { UpdateLockerEntityDto } from './dto/update-locker-entity.dto';
import { CreateLockerRecordDto } from './dto/create-locker-record.dto';
import { UpdateLockerRecordDto } from './dto/update-locker-record.dto';
import { LockerService } from './locker.service';

@ApiTags('locker')
@Controller('api/locker')
@ApiBearerAuth()
export class LockerController {
  constructor(private readonly lockerService: LockerService) {}

  @Post('entities')
  @ApiOperation({ summary: 'Create a locker entity' })
  createEntity(@Body() dto: CreateLockerEntityDto, @CurrentUserId() userId: number) {
    return this.lockerService.createEntity(dto, userId);
  }

  @Get('entities')
  @ApiOperation({ summary: 'List locker entities' })
  findEntities(@CurrentUserId() userId: number) {
    return this.lockerService.findEntities(userId);
  }

  @Get('entities/:uid')
  @ApiOperation({ summary: 'Get a locker entity' })
  findEntity(@Param('uid', ParseUUIDPipe) uid: string, @CurrentUserId() userId: number) {
    return this.lockerService.findEntity(uid, userId);
  }

  @Patch('entities/:uid')
  @ApiOperation({ summary: 'Update a locker entity' })
  updateEntity(
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body() dto: UpdateLockerEntityDto,
    @CurrentUserId() userId: number,
  ) {
    return this.lockerService.updateEntity(uid, dto, userId);
  }

  @Delete('entities/:uid')
  @ApiOperation({ summary: 'Delete a locker entity and its records' })
  deleteEntity(@Param('uid', ParseUUIDPipe) uid: string, @CurrentUserId() userId: number) {
    return this.lockerService.deleteEntity(uid, userId);
  }

  @Post('records')
  @ApiOperation({ summary: 'Create a locker record' })
  createRecord(@Body() dto: CreateLockerRecordDto, @CurrentUserId() userId: number) {
    return this.lockerService.createRecord(dto, userId);
  }

  @Get('records')
  @ApiOperation({ summary: 'List locker records' })
  @ApiQuery({ name: 'entityUid', required: false })
  findRecords(@Query('entityUid') entityUid: string | undefined, @CurrentUserId() userId: number) {
    return this.lockerService.findRecords(entityUid, userId);
  }

  @Get('records/:uid')
  @ApiOperation({ summary: 'Get a locker record' })
  findRecord(@Param('uid', ParseUUIDPipe) uid: string, @CurrentUserId() userId: number) {
    return this.lockerService.findRecord(uid, userId);
  }

  @Patch('records/:uid')
  @ApiOperation({ summary: 'Update a locker record' })
  updateRecord(
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body() dto: UpdateLockerRecordDto,
    @CurrentUserId() userId: number,
  ) {
    return this.lockerService.updateRecord(uid, dto, userId);
  }

  @Delete('records/:uid')
  @ApiOperation({ summary: 'Delete a locker record' })
  deleteRecord(@Param('uid', ParseUUIDPipe) uid: string, @CurrentUserId() userId: number) {
    return this.lockerService.deleteRecord(uid, userId);
  }
}
