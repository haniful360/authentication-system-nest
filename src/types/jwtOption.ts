export interface JwtOption {
  sub: string;
  email: string;
  role: 'admin' | 'student' | 'faculty' | 'recruiter' | 'pro_partner';
}
