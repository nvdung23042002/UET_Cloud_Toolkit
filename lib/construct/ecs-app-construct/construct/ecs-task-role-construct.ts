import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

interface EcsTaskRoleProps extends cdk.StackProps {
  /**
   * ECS application name
   */
  appName: string;
  /**
   * Project and environment prefix
   */
  prefix: string;
  /**
   * Custom policy statements to add to the role
   * @default - No custom policy statements
   */
  policyStatements?: iam.PolicyStatement[];
  /**
   * List of AWS managed policy name to add to the role
   * @default - No AWS managed policy added to the role
   */
  managedPolicy?: string[];
}
export class EcsTaskRole extends Construct {
  readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: EcsTaskRoleProps) {
    super(scope, id);

    // Create Task Role
    this.role = new iam.Role(this, `${props.prefix}-${props.appName}-EcsTaskRole`, {
      roleName: `${props.prefix}-${props.appName}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: `${props.prefix} ${props.appName} Task Role`,
    });

    // ECS base policy
    const commonPolicy = new iam.PolicyStatement({
      actions: [
        'ssmmessages:CreateControlChannel',
        'ssmmessages:CreateDataChannel',
        'ssmmessages:OpenControlChannel',
        'ssmmessages:OpenDataChannel',
        'logs:CreateLogGroup',
        'logs:DescribeLogStreams',
        'logs:DescribeLogGroups',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    });
    this.role.addToPolicy(commonPolicy);

    // Provided policy statements
    if (props.policyStatements) {
      props.policyStatements.forEach((statement) => {
        this.role.addToPolicy(statement);
      });
    }

    // Provided AWS Managed policy
    if (props.managedPolicy) {
      props.managedPolicy.forEach((policyName) => {
        this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(policyName));
      });
    }

    // Output
    new cdk.CfnOutput(this, `${props.prefix}-${props.appName}-EcsTaskRole-Arn`, {
      value: this.role.roleArn,
      exportName: `${props.prefix}-${props.appName}-ecs-task-role-arn`,
    });
  }
}
