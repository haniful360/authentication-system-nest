import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { RegisterUser } from './dto/register-user-dto';
import bcrypt from 'bcrypt';
import cloudinary from '@/lib/utils/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import { Request } from 'express';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private mail: MailerService,
  ) {}

  async sendSignupCode(email: string) {
    const isUser = await this.prisma.client.user.findFirst({
      where: { email },
    });

    if (isUser) {
      throw new ConflictException('User already exists');
    }

    const existing = await this.prisma.client.verificationCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    let finalCode: number;

    if (existing) {
      const now = new Date();
      const createdAt = new Date(existing.createdAt);

      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (diffMinutes < 15) {
        finalCode = existing.code;
      } else {
        await this.prisma.client.verificationCode.deleteMany({
          where: { email },
        });

        finalCode = Math.floor(100000 + Math.random() * 900000);

        await this.prisma.client.verificationCode.create({
          data: {
            email,
            code: finalCode,
          },
        });
      }
    } else {
      finalCode = Math.floor(100000 + Math.random() * 900000);

      await this.prisma.client.verificationCode.create({
        data: {
          email,
          code: finalCode,
        },
      });
    }

    await this.mail.sendMail({
      from: 'Auth Service',
      to: email,
      subject: "You've received a verification code from AuthSystem",
      html: `
        <h3>AuthSystem</h3>
        <p>Your email verification code:</p>
        <h2>${finalCode}</h2>
        <p>This code is valid for 15 minutes.</p>
      `,
    });

    return { message: 'Verification code sent successfully' };
  }

  async verifySignupCode(data: { email: string; verificationCode: string }) {
    const code = Number(data.verificationCode);

    const isValid = await this.prisma.client.verificationCode.findFirst({
      where: {
        email: data.email,
        code,
      },
    });

    if (!isValid) {
      throw new ForbiddenException('Invalid verification code');
    }

    const now = new Date().getTime();
    const createdAt = new Date(isValid.createdAt).getTime();

    if (now - createdAt > 15 * 60 * 1000) {
      throw new ForbiddenException('Verification code has expired');
    }

    await this.prisma.client.verificationCode.update({
      where: {
        id: isValid.id,
      },
      data: {
        isVerified: true,
      },
    });

    return {
      message: 'email verified successfully',
    };
  }

  async register(userData: RegisterUser, profile: Express.Multer.File) {
    const isValid = await this.prisma.client.verificationCode.findFirst({
      where: { email: userData.email, isVerified: true },
    });
    if (!isValid) {
      throw new ForbiddenException(
        "You're not allowed to signup. Please verify first or login to your account",
      );
    }

    if (!profile) {
      throw new HttpException(
        'Profile picture is missing',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploadStream = (file: Express.Multer.File) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'authServiceProfile',
          },
          (err, data) => {
            if (data) resolve(data);
            else
              reject(
                err instanceof Error
                  ? err
                  : new Error(typeof err === 'string' ? err : 'Upload failed'),
              );
          },
        );
        stream.end(file.buffer);
      });
    };

    const result = await uploadStream(profile);
    const imageUrl = result.secure_url;

    const hashedPass = await bcrypt.hash(userData.password, 10);

    await this.prisma.client.user.create({
      data: {
        ...userData,
        password: hashedPass,
        profilePicture: imageUrl,
      },
    });

    await this.prisma.client.verificationCode.delete({
      where: {
        id: isValid.id,
      },
    });

    return {
      message: 'User created successfully, you can now join your account',
    };
  }

  profile(req: Request) {
    return req.user;
  }

  async resetPasswordCode(email: string) {
    const isUser = await this.prisma.client.user.findFirst({
      where: {
        email,
      },
    });

    if (!isUser) {
      throw new NotFoundException('Account not found');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    await this.mail.sendMail({
      from: 'Ridoy Auth',
      to: email,
      subject: `Reset password request for AuthService`,
      html: `
          <h1>Verify your code to reset your password</h1>
          <p>Your reset password code is ${verificationCode}</p>
          <em style="background-color:red; color:white">Don't share with anyone</em>
        `,
    });

    const emails = await this.prisma.client.verificationCode.findMany({
      where: { email },
    });

    if (emails.length > 0) {
      await this.prisma.client.verificationCode.deleteMany({
        where: { email },
      });
    }

    await this.prisma.client.resetCode.create({
      data: {
        email,
        code: verificationCode,
      },
    });

    return {
      message: 'Reset password email sent to your mail',
    };
  }

  async verifyResetCode(data: { email: string; verificationCode: string }) {
    const code = Number(data.verificationCode);
    const isValid = await this.prisma.client.resetCode.findFirst({
      where: {
        email: data.email,
        code,
      },
    });
    if (!isValid) {
      throw new ForbiddenException(
        'Not allowed to reset or no account with this mail',
      );
    }

    const now = new Date().getTime();
    const createdAt = new Date(isValid.createdAt).getTime();

    const ExpirationLimit = 15 * 60 * 1000;

    if (now - createdAt > ExpirationLimit) {
      throw new ForbiddenException('Your request to reset code is expired');
    }

    await this.prisma.client.resetCode.update({
      where: {
        id: isValid.id,
      },
      data: {
        isVerified: true,
      },
    });

    return {
      message: 'Code is verified, now you can change your password',
    };
  }

  async resetPassword(data: { email: string; password: string }) {
    const isValid = await this.prisma.client.resetCode.findFirst({
      where: {
        email: data.email,
        isVerified: true,
      },
    });

    if (!isValid) {
      throw new ForbiddenException('Your request is invalid');
    }

    const user = await this.prisma.client.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (!user || !user?.password) {
      throw new BadRequestException('Invalid user or social login account');
    }

    const isPresentPassMatched = await bcrypt.compare(
      data.password,
      user.password,
    );
    if (isPresentPassMatched) {
      throw new ForbiddenException("You're already using this one");
    }

    let resetPassRecord = await this.prisma.client.resetPassword.findFirst({
      where: { userId: user.id },
    });

    if (!resetPassRecord) {
      resetPassRecord = await this.prisma.client.resetPassword.create({
        data: {
          userId: user.id,
          passwords: [],
        },
      });
    }

    if (resetPassRecord) {
      for (const oldPass of resetPassRecord.passwords) {
        const isMatched = await bcrypt.compare(data.password, oldPass);
        if (isMatched) {
          throw new ForbiddenException(
            'Password already used. Try another one',
          );
        }
      }
    }

    const hashedPass = await bcrypt.hash(data.password, 10);

    await this.prisma.client.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPass,
      },
    });

    await this.prisma.client.resetPassword.update({
      where: {
        id: resetPassRecord.id,
      },
      data: {
        passwords: {
          push: user.password,
        },
      },
    });

    await this.prisma.client.resetCode.delete({
      where: {
        id: isValid.id,
      },
    });

    return {
      message: 'Password reset successful',
    };
  }
}
