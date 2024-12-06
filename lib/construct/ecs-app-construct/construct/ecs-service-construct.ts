import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { EcsTaskRole } from './ecs-task-role-construct';

export interface EcsServiceConstructProps extends cdk.StackProps {
  /**
   * ECS application VPC
   */
  myVpc: ec2.Vpc;
  /**
   * ECS cluster properties
   */
  ecsCluster: ecs.Cluster;
  /**
   * ECS service name
   */
  ecsServiceName: string;
  /**
   * ECS Fargate security group
   */
  securityGroupForFargate: ec2.SecurityGroup;
  /**
   * ECS Fargate task execution role
   */
  ecsTaskExecutionRole: iam.Role;
  /**
   * Project and environment prefix
   */
  prefix: string;
  /**
   * Custom Task role Policy statements to add to the role
   * @default - No custom policy statements
   */
  ecsTaskRolePolicyStatements?: iam.PolicyStatement[];
}

export class EcsServiceConstruct extends Construct {
  public readonly ecsService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsServiceConstructProps) {
    super(scope, id);

    const ecsTaskRole = new EcsTaskRole(this, 'EcsTaskRole', {
      appName: props.ecsServiceName,
      prefix: props.prefix,
      policyStatements: props.ecsTaskRolePolicyStatements,
    });

    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
    const ecsTask = new ecs.FargateTaskDefinition(this, 'EcsTask', {
      executionRole: props.ecsTaskExecutionRole,
      taskRole: ecsTaskRole.role,
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const ecsContainer = ecsTask.addContainer('EcsApp', {
      // -- Option 1: If you want to use your ECR repository with pull through cache, you can use like this.
      //image: ecs.ContainerImage.fromEcrRepository(containerRepository, 'latest'),

      // -- Option 2: If you want to use your ECR repository, you can use like this.
      // --           You Need to create your repository and dockerimage, then pass it to this stack.
      // image: ecs.ContainerImage.fromEcrRepository(props.repository, props.imageTag),

      // -- Option 3: If you want to use DockerHub, you can use like this.
      // --           You need public access route to internet for ECS Task.
      // --           See vpcSubnets property for new ecs.FargateService().
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:stable'),

      environment: {
        ENVIRONMENT_VARIABLE_SAMPLE_KEY: 'Environment Variable Sample Value',
      },
      // --SAMPLE: Get value from SecretsManager
      // secrets: {
      //   SECRET_VARIABLE_SAMPLE_KEY: ecs.Secret.fromSecretsManager(secretsManagerConstruct, 'secret_key'),
      // },
    });

    ecsContainer.addPortMappings({
      containerPort: 80,
    });

    const ecsService = new ecs.FargateService(this, 'FargateService', {
      serviceName: props.ecsServiceName,
      cluster: props.ecsCluster,
      taskDefinition: ecsTask,
      desiredCount: 2,

      // The LATEST is recommended platform version.
      // But if you need another version replace this.
      // See also:
      // - https://docs.aws.amazon.com/AmazonECS/latest/userguide/platform_versions.html
      // - https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ecs.FargatePlatformVersion.html
      platformVersion: ecs.FargatePlatformVersion.LATEST,

      // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html#fargate-capacity-providers
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE',
          weight: 1,
        },
        // -- SAMPLE: Fargate Spot
        //{
        //  capacityProvider: 'FARGATE_SPOT',
        //  weight: 2,
        //},
      ],
      vpcSubnets: props.myVpc.selectSubnets({
        subnetGroupName: 'Private',
      }),
      securityGroups: [props.securityGroupForFargate],
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
    });
    this.ecsService = ecsService;
  }
}
