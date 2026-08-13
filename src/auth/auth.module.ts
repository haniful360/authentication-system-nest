import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '@/lib/strategies/jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtGuard } from '@/lib/guards/jwt/jwt.guard';
import { GoogleStrategy } from '@/lib/strategies/google.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jsjlaiajf',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard, JwtService, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
