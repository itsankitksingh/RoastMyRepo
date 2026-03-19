import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoastController } from './roast.controller';
import { RoastService } from './roast.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'apps', 'web', 'dist', 'web', 'browser'),
      exclude: ['/api*'],
    }),
  ],
  controllers: [AppController, RoastController],
  providers: [AppService, RoastService],
})
export class AppModule {}
