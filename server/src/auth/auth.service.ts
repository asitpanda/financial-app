import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { resolveDbProviderFromConfig } from '../database/db-provider';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { mockUser, mockToken, mockCredentials, registeredUsers } from '../mockdata';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private isMockMode: boolean;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const dbProvider = resolveDbProviderFromConfig(this.configService);
    this.isMockMode = dbProvider === 'mock';
  }

  async register(registerDto: RegisterDto) {
    if (this.isMockMode) {
      return this.mockRegister(registerDto);
    }

    const email = registerDto.email.trim().toLowerCase();
    const password = registerDto.password;
    const name = registerDto.name?.trim() || null;
    const userId = registerDto.userId?.trim() || null;
    const mobile = registerDto.mobile?.trim() || null;

    // Check uniqueness for provided identifiers.
    const uniquenessChecks: Prisma.UserWhereInput[] = [{ email }];
    if (userId) uniquenessChecks.push({ userId });
    if (mobile) uniquenessChecks.push({ mobile });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: uniquenessChecks },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
      if (userId && existingUser.userId === userId) {
        throw new ConflictException('User ID already taken');
      }
      if (mobile && existingUser.mobile === mobile) {
        throw new ConflictException('Mobile number already registered');
      }

      throw new ConflictException('A user with provided credentials already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        userId,
        mobile,
        password: hashedPassword,
        name,
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    if (this.isMockMode) {
      return this.mockLogin(loginDto);
    }

    const { identifier, password } = loginDto;
    const normalizedIdentifier = identifier.trim();
    const normalizedEmailIdentifier = normalizedIdentifier.toLowerCase();

    // Try to find user by email, userId, or mobile
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmailIdentifier },
          { userId: normalizedIdentifier },
          { mobile: normalizedIdentifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async validateUser(userId: number | string) {
    if (this.isMockMode) {
      const matchedUser = registeredUsers.find(
        (user) => Number(user.id) === Number(userId),
      );

      if (!matchedUser) {
        return null;
      }

      return {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
      };
    }

    return this.prisma.user.findUnique({
      where: { id: Number(userId) as any },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  private generateToken(userId: number | string, email: string) {
    const payload = { sub: String(userId), email };
    return this.jwtService.sign(payload);
  }

  // Mock mode methods
  private mockRegister(registerDto: RegisterDto) {
    // Check if email already exists
    const existingUser = registeredUsers.find(
      (u) => u.email === registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if userId already exists (if provided)
    if (registerDto.userId) {
      const existingUserId = registeredUsers.find(
        (u) => u.userId === registerDto.userId,
      );
      if (existingUserId) {
        throw new ConflictException('User ID already taken');
      }
    }

    // Check if mobile already exists (if provided)
    if (registerDto.mobile) {
      const existingMobile = registeredUsers.find(
        (u) => u.mobile === registerDto.mobile,
      );
      if (existingMobile) {
        throw new ConflictException('Mobile number already registered');
      }
    }

    // Generate a unique ID for the new user
    const newUserId = registeredUsers.length
      ? Math.max(...registeredUsers.map((user) => user.id)) + 1
      : 1;

    const newUser = {
      id: newUserId,
      userId: registerDto.userId ?? null,
      email: registerDto.email,
      mobile: registerDto.mobile ?? null,
      name: registerDto.name || 'New User',
      password: registerDto.password, // In mock mode, store plain password
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to in-memory store
    registeredUsers.push(newUser);

    const user = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };

    // Generate a token for the new user
    const token = this.generateToken(newUserId, registerDto.email);

    return {
      user,
      token,
    };
  }

  private mockLogin(loginDto: LoginDto) {
    // Find user by identifier (email, userId, or mobile)
    const user = registeredUsers.find(
      (u) =>
        u.email === loginDto.identifier ||
        u.userId === loginDto.identifier ||
        u.mobile === loginDto.identifier,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password (plain text in mock mode)
    if (user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: userResponse,
      token,
    };
  }
}
