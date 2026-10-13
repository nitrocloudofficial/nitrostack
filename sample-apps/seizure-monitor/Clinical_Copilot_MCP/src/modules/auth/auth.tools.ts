import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { UserRepository } from '../../repositories/user.repository.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { hashPassword, verifyPassword, generateSessionToken } from '../../utils/crypto.utils.js';
import { UserDocument } from '../../schemas/user.schema.js';
import { PatientDocument } from '../../schemas/patient.schema.js';

/**
 * Request DTO interface for authenticate_user tool
 */
export interface AuthenticateUserInput {
  action: 'login' | 'register';
  email: string;
  password: string;
  name?: string;
}

/**
 * Response DTO interface for authenticate_user tool
 */
export interface AuthenticateUserOutput {
  success: boolean;
  action: 'login' | 'register';
  patientId: string;
  token: string;
  name: string;
  message?: string;
}

/**
 * Clinical Copilot MCP Server - Auth Tools
 *
 * Implements MongoDB Atlas user authentication and account registration with strict mode enforcement:
 * - action = 'login': Authenticates existing registered accounts. Fails if user is not registered or credentials are invalid.
 * - action = 'register': Registers new accounts into MongoDB Atlas ('users' & 'patients' collections). Fails if account already exists.
 */
@Controller()
@Injectable({ deps: [UserRepository, PatientRepository] })
export class AuthTools {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly patientRepository: PatientRepository
  ) {}

  @Tool({
    name: 'authenticate_user',
    description: 'Authenticate a patient via MongoDB Atlas. Action "login" authenticates existing registered users (fails if unregistered). Action "register" creates a new user account & patient profile.',
    inputSchema: z.object({
      action: z.enum(['login', 'register']).default('login').describe('Action mode: "login" to authenticate existing account, or "register" to create a new user account'),
      email: z.string().min(1, 'Email or username is required').describe('Patient email address or username'),
      password: z.string().min(6, 'Password must be at least 6 characters').describe('Patient password (minimum 6 characters)'),
      name: z.string().optional().describe('Full name of the patient (used during registration)'),
    }),
  })
  async authenticateUser(input: AuthenticateUserInput, ctx: ExecutionContext): Promise<AuthenticateUserOutput> {
    const action = input.action || 'login';
    const normalizedEmail = input.email.toLowerCase().trim();
    ctx.logger.info(`Processing authenticate_user (${action}) for account: '${normalizedEmail}'`);
    console.error(`[AuthTools] authenticate_user request -> action: '${action}', account: '${normalizedEmail}'`);

    // Query existing account from MongoDB Atlas 'users' collection
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    console.error(`[AuthTools] Account query result for '${normalizedEmail}':`, existingUser ? `FOUND (userId: '${existingUser.userId}', patientId: '${existingUser.patientId}')` : 'NULL (NOT FOUND)');

    if (action === 'login') {
      // --- STRICT LOGIN WORKFLOW ---
      if (!existingUser) {
        throw new Error(`Authentication failed: No registered user account found for '${input.email}'. Please register first.`);
      }

      const isValidPassword = verifyPassword(input.password, existingUser.passwordHash, existingUser.salt);
      if (!isValidPassword) {
        throw new Error('Authentication failed: Incorrect password provided.');
      }

      // Generate signed JWT session token
      const token = generateSessionToken({
        userId: existingUser.userId,
        patientId: existingUser.patientId,
        email: existingUser.email,
      });

      ctx.logger.info(`User logged in successfully: ${existingUser.userId} (Patient ID: ${existingUser.patientId})`);
      console.error(`[AuthTools] Login successful for '${normalizedEmail}' -> patientId: '${existingUser.patientId}'`);

      return {
        success: true,
        action: 'login',
        patientId: existingUser.patientId,
        token,
        name: existingUser.name,
        message: 'Login successful.',
      };
    } else {
      // --- STRICT REGISTER WORKFLOW ---
      if (existingUser) {
        throw new Error(`Registration failed: Account '${input.email}' is already registered. Please log in instead.`);
      }

      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const patientId = `patient_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const defaultName = normalizedEmail.includes('@')
        ? normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
        : normalizedEmail;
      const fullName = input.name ? input.name.trim() : defaultName;

      // Hash password securely using PBKDF2-SHA512
      const { hash, salt } = hashPassword(input.password);

      // Persist User record into MongoDB Atlas 'users' collection
      const newUser: UserDocument = {
        userId,
        email: normalizedEmail,
        passwordHash: hash,
        salt,
        patientId,
        name: fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.userRepository.create(newUser);

      // Initialize corresponding Patient record in MongoDB Atlas 'patients' collection
      const newPatient: PatientDocument = {
        patientId,
        name: fullName,
        age: 0,
        gender: 'Unspecified',
        disease: 'Unspecified',
        diagnosis: 'Newly registered account profile',
        medications: [],
        labValues: {},
        doctor: 'Unassigned',
        hospital: 'Unassigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.patientRepository.create(newPatient);

      // Generate signed JWT session token
      const token = generateSessionToken({
        userId: newUser.userId,
        patientId: newUser.patientId,
        email: newUser.email,
      });

      ctx.logger.info(`Successfully registered new user '${userId}' and created patient profile '${patientId}' in MongoDB Atlas.`);
      console.error(`[AuthTools] Registration successful for '${normalizedEmail}' -> userId: '${userId}', patientId: '${patientId}'`);

      return {
        success: true,
        action: 'register',
        patientId: newUser.patientId,
        token,
        name: newUser.name,
        message: 'Account registration successful.',
      };
    }
  }
}
