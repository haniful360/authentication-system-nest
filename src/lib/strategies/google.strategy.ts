import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    super({
      clientID: (process.env.OAUTH_CLIENT as string) || 'dummy_client_id',
      clientSecret:
        (process.env.OAUTH_CLIENT_SECRET as string) || 'dummy_client_secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value || '';
    const photo = profile.photos?.[0]?.value || '';
    const displayName = profile.displayName || '';

    const user = await this.prisma.client.user.upsert({
      where: {
        email,
      },
      create: {
        full_name: displayName,
        email,
        role: 'student',
        profilePicture: photo,
      },
      update: {
        full_name: displayName,
        role: 'student',
        profilePicture: photo,
      },
    });

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: (process.env.JWT_SECRET as string) || 'jsjlaiajf',
        expiresIn: '1h',
      },
    );

    done(null, { user, accessToken });
  }
}
