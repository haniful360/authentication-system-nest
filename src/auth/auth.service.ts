import bcrypt from 'bcrypt';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/LoginDto';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { User } from '@prisma';
import { JwtService } from '@nestjs/jwt';
import { UAParser } from 'ua-parser-js';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginDto, req: Request) {
    const user = await this.prisma.client.user.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (!user.password) {
      throw new ForbiddenException(
        'This account may be made by google authentication',
      );
    }

    const isPassValid = await bcrypt.compare(data.password, user.password);

    if (!isPassValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const result = { ...user };
    delete (result as Partial<User>).password;

    const tokens = this.generateToken(user);

    const userAgent = req.header('User-Agent');
    const parser = new UAParser(userAgent);

    const session = await this.prisma.client.sessions.create({
      data: {
        userId: user.id,
        jwtToken: tokens.accessToken,
        ip: req.ip,
        device: parser.getOS().name,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      message: 'User logged in successfully',
      result,
      accessToken: tokens.accessToken,
      session,
    };
  }

  private generateToken(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: User) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: (process.env.JWT_SECRET as string) || 'jsjlaiajf',
        expiresIn: '1h',
      },
    );
  }

  private generateRefreshToken(user: User) {
    return this.jwtService.sign(
      { sub: user.id },
      {
        secret: (process.env.JWT_REFRESH as string) || 'refresh_jldalkf',
        expiresIn: '7d',
      },
    );
  }

  async getActiveDevices(req: Request) {
    if (!req.user) {
      throw new ForbiddenException('Unauthorized request');
    }

    const payload = req.user;

    const sessions = await this.prisma.client.sessions.findMany({
      where: {
        userId: payload.sub,
      },
      orderBy: { expiresAt: 'desc' },
    });
    return sessions;
  }

  async removeAllSession(req: Request) {
    const payload = req.user;
    if (!payload) {
      throw new ForbiddenException("You're not yet logged in to do this");
    }

    const token = req.headers['authorization']?.split(' ')[1];

    await this.prisma.client.sessions.deleteMany({
      where: {
        userId: payload.sub,
        NOT: { jwtToken: token },
      },
    });

    return {
      message: 'Removed all sessions',
    };
  }

  async removeSession(sessionId: string) {
    await this.prisma.client.sessions.delete({
      where: { id: sessionId },
    });
    return {
      message: 'Session removed',
    };
  }

  async handleJwtAuthCallback(
    data: { user: User; accessToken: string },
    req: Request,
  ) {
    const { user, accessToken } = data;

    const userAgent = req.header('User-Agent');
    const parser = new UAParser(userAgent);

    const session = await this.prisma.client.sessions.create({
      data: {
        userId: user.id,
        jwtToken: accessToken,
        ip: req.ip,
        device: parser.getOS().name,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      message: 'User logged in successfully',
      result: user,
      accessToken,
      session,
    };
  }
}
