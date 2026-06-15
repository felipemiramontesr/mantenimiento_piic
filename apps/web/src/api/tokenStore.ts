let accessToken: string | null = null;

export const setToken = (t: string | null): void => {
  accessToken = t;
};

export const getToken = (): string | null => accessToken;

export const clearToken = (): void => {
  accessToken = null;
};
