// src/config/cognito.ts
export const cognitoConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_PfYeX5gJJ',
  userPoolWebClientId: '6ngukeae2ss8t3pmfr69820rjq',
} as const;

// Amplify v6 configuration format
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolWebClientId,
    },
  },
};