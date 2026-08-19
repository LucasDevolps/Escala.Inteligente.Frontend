export type UserRole = 'MANAGER' | 'EMPLOYEE';

export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly role: UserRole;
  readonly organizationId: string;
  readonly email?: string;
  readonly employeeId?: string | null;
  readonly mustChangePassword?: boolean;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly tokenType: 'Bearer' | string;
  readonly expiresIn: number;
  readonly user: AuthUser;
}

export interface ProblemDetails {
  readonly title?: string;
  readonly status?: number;
  readonly code?: string;
  readonly detail?: string;
  readonly traceId?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export interface PagedResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export type ProductivityLevel = 0 | 1 | 2;

export interface Employee {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly employeeNumber: string;
  readonly productivityLevel: ProductivityLevel;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
  readonly rowVersion?: string;
}

export interface EmployeeUpsertRequest {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly employeeNumber: string;
  readonly productivityLevel: ProductivityLevel;
  readonly rowVersion?: string;
}

export interface CreateEmployeeResponse {
  readonly employee: Employee;
  readonly activationCode: string;
}

export type ScheduleStatus = 'DRAFT' | 'SUGGESTED' | 'IN_REVIEW' | 'PUBLISHED' | 'CLOSED';
export type AssignmentSource = 'SUGGESTED' | 'MANUAL' | 'SWAP' | 'TIME_OFF_ADJUSTMENT';

export interface ScheduleAssignment {
  readonly id?: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly workDate: string;
  readonly source: AssignmentSource;
  readonly reasons?: readonly string[];
}

export interface ScheduleWarning {
  readonly code?: string;
  readonly message: string;
  readonly date?: string;
  readonly employeeId?: string;
}

export interface Schedule {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly status: ScheduleStatus;
  readonly revision: number;
  readonly rowVersion: string;
  readonly assignments: readonly ScheduleAssignment[];
  readonly warnings: readonly ScheduleWarning[];
  readonly createdAt?: string;
  readonly publishedAt?: string | null;
  readonly publishedBy?: string | null;
}

export interface UpdateScheduleDayResponse {
  readonly assignments: readonly ScheduleAssignment[];
  readonly warnings: readonly ScheduleWarning[];
  readonly rowVersion: string;
}

export type TimeOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type TimeOffReasonCategory = 'PERSONAL' | 'APPOINTMENT' | 'OTHER';

export interface TimeOffRequest {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName?: string;
  readonly date: string;
  readonly reasonCategory: TimeOffReasonCategory;
  readonly reasonDescription?: string | null;
  readonly status: TimeOffStatus;
  readonly requestedAt: string;
  readonly reviewedAt?: string | null;
  readonly reviewedBy?: string | null;
  readonly rejectionReason?: string | null;
  readonly rowVersion?: string;
}

export type ShiftSwapStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface ShiftSwapCandidate {
  readonly employeeId: string;
  readonly name: string;
  readonly employeeNumber?: string;
}

export interface ShiftSwap {
  readonly id: string;
  readonly date: string;
  readonly requesterEmployeeId: string;
  readonly requesterName?: string;
  readonly targetEmployeeId: string;
  readonly targetName?: string;
  readonly status: ShiftSwapStatus;
  readonly requestedAt: string;
  readonly respondedAt?: string | null;
  readonly rowVersion?: string;
  readonly canRespond?: boolean;
}

export interface AppNotification {
  readonly id: string;
  readonly type: string;
  readonly referenceId?: string | null;
  readonly title?: string;
  readonly message?: string;
  readonly content?: string;
  readonly createdAt: string;
  readonly readAt?: string | null;
}

export interface NotificationSignal {
  readonly notificationId: string;
}

export type SessionEndReason = 'logout' | 'expired' | 'revoked' | 'invalid';

export const EMPTY_PAGE: PagedResponse<never> = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};
