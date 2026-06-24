import { UserRole, UserStatus } from '../constants/roles';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl: string | null;
  orgName: string | null;
  orgDescription: string | null;
  idDocumentUrl: string | null;
  idDocumentType: string | null;
  aadharDocumentUrl: string | null;
  panDocumentUrl: string | null;
  gstNumber: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
}
