import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface OidcIAMRoleConstructProps extends cdk.StackProps {
  /**
   * Git hosting organization name
   */
  OrganizationName: string;
  /**
   * Git repository name
   */
  RepositoryName: string;
  /**
   * OIDC provider arn
   */
  openIdConnectProviderArn: string;
  /**
   * IAM policy statement add to OIDC role
   */
  statement: iam.PolicyStatementProps[];
}

export class OidcIAMRoleConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OidcIAMRoleConstructProps) {
    super(scope, id);

    const oidcRole = new iam.Role(this, id, {
      assumedBy: new iam.WebIdentityPrincipal(props.openIdConnectProviderArn, {
        StringEquals: {
          ['token.actions.githubusercontent.com:aud']: 'sts.amazonaws.com',
        },
        StringLike: {
          ['token.actions.githubusercontent.com:sub']:
            'repo:' + props.OrganizationName + '/' + props.RepositoryName + ':*',
        },
      }),
    });

    for (const value of props.statement) {
      const oidcPolicy = new iam.PolicyStatement({
        effect: value.effect,
        actions: value.actions,
        resources: value.resources,
        conditions: value.conditions,
      });
      oidcRole.addToPolicy(oidcPolicy);
    }
  }
}
