import type { Request } from 'express';

export type RequestContextUser = {
  id?: number | string;
  email?: string;
  name?: string | null;
};

export type RequestWithContext = Request & {
  requestId?: string;
  user?: RequestContextUser;
};
