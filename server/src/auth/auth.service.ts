import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
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
    this.isMockMode = this.configService.get('DB_PROVIDER', 'mock') === 'mock';
  }

  async register(registerDto: RegisterDto) {
    if (this.isMockMode) {
      return this.mockRegister(registerDto);
    }

    const { email, password, name } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
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

    // Try to find user by email, userId, or mobile
    // Note: You'll need to add userId and mobile fields to your Prisma schema
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          // Add these when schema is updated:
          // { userId: identifier },
          // { mobile: identifier },
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
      userId: registerDto.userId,
      email: registerDto.email,
      mobile: registerDto.mobile,
      name: registerDto.name || 'New User',
      password: registerDto.password, // In mock mode, store plain password
      createdAt: new Date(),
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
