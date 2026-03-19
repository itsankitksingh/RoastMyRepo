import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoastController } from './roast.controller';
import { RoastService } from './roast.service';

@Module({
  imports: [],
  controllers: [AppController, RoastController],
  providers: [AppService, RoastService],
})
export class AppModule {}
