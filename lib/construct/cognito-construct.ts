import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';

interface CognitoProps extends cdk.StackProps {
  /**
   * Prefix for Cognito hosted UI domain
   *
   * @example - https://domainPrefix.auth.region.amazoncognito.com
   */
  domainPrefix: string;
  /**
   * URL for callbacks
   */
  urlForCallback: string[];
  /**
   * URL for logout
   */
  urlForLogout: string[];
  /**
   * OAuth Client Secret
   *
   * @default - required if identityProvider is defined
   */
  secretArn?: string;
  /**
   * Federated identity provider sign-in
   *
   * @default - none
   */
  identityProvider?: typeof cognito.UserPoolClientIdentityProvider.COGNITO;
}

export class Cognito extends Construct {
  readonly userPool: cognito.UserPool;
  readonly props: CognitoProps;

  constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id);

    this.props = props;

    // User Pool
    this.userPool = new cognito.UserPool(this, 'CognitoUserPool', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: this.props.domainPrefix,
      },
    });

    const userPoolClient = this.userPool.addClient('UserPoolClient', {
      generateSecret: false,
      oAuth: {
        callbackUrls: this.props.urlForCallback,
        logoutUrls: this.props.urlForLogout,
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    if (this.props.identityProvider === cognito.UserPoolClientIdentityProvider.GOOGLE) {
      userPoolClient.node.addDependency(this.createIdentityProviderGoogle());
    }
  }

  createIdentityProviderGoogle() {
    const googleOAuthClientSecret = sm.Secret.fromSecretAttributes(this, 'GoogleOAuthClientSecret', {
      secretCompleteArn: this.props.secretArn,
    });

    return new cognito.UserPoolIdentityProviderGoogle(this, 'UserPoolIdentityProviderGoogle', {
      userPool: this.userPool,
      clientId: googleOAuthClientSecret.secretValueFromJson('client_id').unsafeUnwrap(),
      clientSecretValue: googleOAuthClientSecret.secretValueFromJson('client_secret'),

      // Email scope is required, because the default is 'profile' and that doesn't allow Cognito
      // to fetch the user's email from his Google account after the user does an SSO with Google
      scopes: ['email'],

      // Map fields from the user's Google profile to Cognito user fields, when the user is auto-provisioned
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
      },
    });
  }
}
