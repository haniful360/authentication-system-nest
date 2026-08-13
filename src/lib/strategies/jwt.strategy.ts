import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { JwtOption } from '@/types/jwtOption';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (process.env.JWT_SECRET as string) || 'jsjlaiajf',
    });
  }

  async validate(payload: JwtOption) {
    const user = await this.prisma.client.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
    if (!user) {
      throw new ForbiddenException('Unauthorized user');
    }

    return payload;
  }
}
