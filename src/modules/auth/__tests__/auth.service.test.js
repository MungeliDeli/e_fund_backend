// src/modules/auth/__tests__/auth.service.test.js

import authService from '../auth.service.js';
import authRepository from '../auth.repository.js';
import { hashPassword } from '../../../utils/password.utils.js';
import { AuthenticationError, ConflictError } from '../../../utils/appError.js';

// Mock dependencies
jest.mock('../auth.repository.js');
jest.mock('../../../utils/password.utils.js');
jest.mock('../../../utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  security: {
    loginAttempt: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerIndividualUser', () => {
    const mockRegistrationData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      country: 'USA',
      city: 'New York',
      address: '123 Main St'
    };

    const mockCreatedUser = {
      user: {
        userId: 'test-user-id',
        email: 'test@example.com',
        userType: 'individual_user',
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date()
      },
      profile: {
        userId: 'test-user-id',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        country: 'USA',
        city: 'New York',
        address: '123 Main St',
        createdAt: new Date()
      }
    };

    it('should register a new individual user successfully', async () => {
      // Mock repository methods
      authRepository.emailExists.mockResolvedValue(false);
      authRepository.phoneNumberExists.mockResolvedValue(false);
      authRepository.createUserWithProfile.mockResolvedValue(mockCreatedUser);
      hashPassword.mockResolvedValue('hashedPassword');

      const result = await authService.registerIndividualUser(mockRegistrationData);

      expect(authRepository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(authRepository.phoneNumberExists).toHaveBeenCalledWith('+1234567890');
      expect(hashPassword).toHaveBeenCalledWith('TestPassword123!');
      expect(authRepository.createUserWithProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          passwordHash: 'hashedPassword',
          userType: 'individual_user',
          isEmailVerified: false,
          isActive: true
        }),
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+1234567890',
          gender: 'Male',
          dateOfBirth: '1990-01-01',
          country: 'USA',
          city: 'New York',
          address: '123 Main St'
        })
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.userType).toBe('individual_user');
    });

    it('should throw ConflictError if email already exists', async () => {
      authRepository.emailExists.mockResolvedValue(true);

      await expect(authService.registerIndividualUser(mockRegistrationData))
        .rejects
        .toThrow(ConflictError);

      expect(authRepository.emailExists).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw ConflictError if phone number already exists', async () => {
      authRepository.emailExists.mockResolvedValue(false);
      authRepository.phoneNumberExists.mockResolvedValue(true);

      await expect(authService.registerIndividualUser(mockRegistrationData))
        .rejects
        .toThrow(ConflictError);

      expect(authRepository.phoneNumberExists).toHaveBeenCalledWith('+1234567890');
    });
  });

  describe('authenticateUser', () => {
    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      userType: 'individual_user',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date()
    };

    it('should authenticate user successfully', async () => {
      authRepository.findByEmail.mockResolvedValue(mockUser);
      const { comparePasswords } = await import('../../../utils/password.utils.js');
      comparePasswords.mockResolvedValue(true);

      const result = await authService.authenticateUser('test@example.com', 'password');

      expect(authRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePasswords).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw AuthenticationError if user not found', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.authenticateUser('test@example.com', 'password'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if password is incorrect', async () => {
      authRepository.findByEmail.mockResolvedValue(mockUser);
      const { comparePasswords } = await import('../../../utils/password.utils.js');
      comparePasswords.mockResolvedValue(false);

      await expect(authService.authenticateUser('test@example.com', 'wrongpassword'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if account is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      authRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(authService.authenticateUser('test@example.com', 'password'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('forgotPassword', () => {
    it('should return a generic message even if user does not exist', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      const result = await authService.forgotPassword('notfound@example.com');
      expect(result).toHaveProperty('message');
      expect(result.message).toMatch(/password reset instructions/i);
    });

    it('should generate and store a reset token for an active user', async () => {
      const mockUser = { userId: 'user-1', email: 'test@example.com', isActive: true };
      authRepository.findByEmail.mockResolvedValue(mockUser);
      authRepository.setResetToken.mockResolvedValue();
      const result = await authService.forgotPassword('test@example.com');
      expect(authRepository.setResetToken).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  describe('resetPassword', () => {
    it('should throw if token is invalid or expired', async () => {
      authRepository.findByResetToken.mockResolvedValue(null);
      await expect(authService.resetPassword('badtoken', 'NewPass123!'))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should update password and clear token for valid token', async () => {
      const mockUser = { userId: 'user-1', email: 'test@example.com', isActive: true };
      authRepository.findByResetToken.mockResolvedValue(mockUser);
      authRepository.updatePassword.mockResolvedValue();
      authRepository.clearResetToken.mockResolvedValue();
      const { hashPassword } = await import('../../../utils/password.utils.js');
      hashPassword.mockResolvedValue('hashedNewPassword');
      const result = await authService.resetPassword('validtoken', 'NewPass123!');
      expect(authRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hashedNewPassword');
      expect(authRepository.clearResetToken).toHaveBeenCalledWith('user-1');
      expect(result).toHaveProperty('message');
      expect(result.message).toMatch(/reset successfully/i);
    });
  });
}); 