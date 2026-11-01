import { Body, Controller, Get, Patch, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UserPreferencesService } from './user-preferences.service';

@ApiTags('user-preferences')
@ApiBearerAuth()
@Controller('api/users/me/preferences')
export class UserPreferencesController {
  constructor(private readonly preferences: UserPreferencesService) {}

  @Get()
  get(@CurrentUserId() userId: number) {
    return this.preferences.get(userId);
  }

  @Patch()
  update(
    @CurrentUserId() userId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    patch: UpdateUserPreferencesDto,
  ) {
    return this.preferences.update(userId, patch);
  }
}