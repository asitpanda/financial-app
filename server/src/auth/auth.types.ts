export type JwtPayload = {
  sub: string;
  email: string;
};

export type UserRecord = {
  id: number;
  userId: string | null;
  email: string;
  mobile: string | null;
  password: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};
