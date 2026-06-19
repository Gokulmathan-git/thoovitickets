import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
