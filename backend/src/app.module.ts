import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TwoFactorMiddleware } from './two-factor.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ConfigModule.forRoot({
      // @dotenv
      isGlobal: true,
      envFilePath: 'env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TwoFactorMiddleware)
      .exclude({ path: 'auth/verify-2fa', method: RequestMethod.POST })
      .forRoutes(AppController);
  }
}
