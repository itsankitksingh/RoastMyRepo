import { Body, Controller, Post } from '@nestjs/common';
import { RoastService } from './roast.service';

@Controller('api/roast')
export class RoastController {
  constructor(private readonly roastService: RoastService) {}

  @Post()
  async roast(
    @Body() body: { username?: string; accessToken?: string },
  ) {
    return this.roastService.roast({
      username: body.username?.trim() || '',
      accessToken: body.accessToken,
    });
  }
}
