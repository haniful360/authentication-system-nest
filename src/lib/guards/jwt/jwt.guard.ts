import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];
    const token =
      typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;

    if (!token) return false;

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        secret: process.env.JWT_SECRET || 'jsjlaiajf',
      });

      if (!payload) throw new UnauthorizedException('User not authenticated');

      const session = await this.prisma.client.sessions.findFirst({
        where: {
          userId: payload.sub,
          jwtToken: token,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) return false;

      req.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
