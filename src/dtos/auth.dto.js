export const bodyToSignUp = (body) => {
  return {
    name: body.name,
    username: body.username,
    email: body.email,
    password: body.password,
    avatar: body.avatar || null,
  };
};
export const bodyToSignIn = (body) => {
  return {
    email: body.email,
    password: body.password,
  };
};

export const bodyToRefresh = (body) => {
  return {
    refreshToken: body.refreshToken,
  };
};

export const responseFromAuth = ({ auth }) => {
  return {
    userId: auth.id,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    createdAt: auth.createdAt,
    updatedAt: auth.updatedAt,
  };
};
