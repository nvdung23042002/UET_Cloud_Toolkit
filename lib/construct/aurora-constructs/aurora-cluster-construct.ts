import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AuroraBaseClusterProps {
  /**
   * The name of the database.
   */
  readonly dbName: string;

  /**
   * The username for the master user.
   */
  readonly dbUser: string;

  /**
   * The minimum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
   */
  readonly auroraMinAcu: number;

  /**
   * The maximum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
   */
  readonly auroraMaxAcu: number;

  /**
   * The VPC to place the cluster in.
   */
  readonly vpc: ec2.Vpc;

  /**
   * The subnets to place the cluster in.
   */
  readonly vpcSubnets: ec2.SubnetSelection;

  /**
   * The instance type for the writer instance.
   */
  readonly writerInstanceType: ec2.InstanceType;

  /**
   * The instance type for the reader instance.
   */
  readonly readerInstanceType: ec2.InstanceType;

  /**
   * The key to use for encryption of data at rest in the cluster.
   */
  readonly appKey: kms.IKey;

  /**
   * Whether to enable Performance Insights.
   *
   * @default - false
   */
  readonly enablePerformanceInsights?: boolean;

  /**
   * The security group for the App server.
   *
   * @default - No security group is added
   */
  readonly appServerSecurityGroup?: ec2.SecurityGroup;

  /**
   * The security group for the Bastion Container.
   *
   * @default - No security group is added
   */
  readonly bastionSecurityGroup?: ec2.SecurityGroup;

  /**
   * Parameter group for the cluster.
   *
   * @default - No parameter group is added
   */
  readonly clusterParameters?: Record<string, string>;

  /**
   * Parameter group for the instance.
   *
   * @default - No parameter group is added
   */
  readonly instanceParameters?: Record<string, string>;
}

export interface AuroraClusterProps extends AuroraBaseClusterProps {
  /**
   * What kind of database to start.
   */
  readonly dbEngine: rds.IClusterEngine;

  /**
   * The list of log types to export to CloudWatch.
   */
  readonly cloudwatchLogsExports: string[];

  /**
   * The duration of the backtrack window, in seconds.
   *
   * @default - 0
   */
  readonly backtrackWindow?: cdk.Duration;
}

export class AuroraCluster extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraClusterProps) {
    super(scope, id);

    const clusterParameterGroup = new rds.ParameterGroup(this, 'AuroraClusterParameterGroup', {
      engine: props.dbEngine,
      description: 'Aurora Cluster Parameter Group',
      parameters: props.clusterParameters,
    });

    const instanceParameterGroup = new rds.ParameterGroup(this, 'AuroraInstanceParameterGroup', {
      engine: props.dbEngine,
      description: 'Aurora Instance Parameter Group',
      parameters: props.instanceParameters,
    });

    // If PerformanceInsights is not used, Encryption Key, Retention cannot be set.
    const performanceInsightEncryptionKey = props.enablePerformanceInsights ? props.appKey : undefined;
    const performanceInsightRetention = props.enablePerformanceInsights
      ? rds.PerformanceInsightRetention.DEFAULT
      : undefined;

    this.cluster = new rds.DatabaseCluster(this, 'Aurora', {
      backtrackWindow: props.backtrackWindow,
      engine: props.dbEngine,
      parameterGroup: clusterParameterGroup,
      credentials: rds.Credentials.fromGeneratedSecret(props.dbUser),
      serverlessV2MaxCapacity: props.auroraMaxAcu,
      serverlessV2MinCapacity: props.auroraMinAcu,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      writer: rds.ClusterInstance.provisioned('writer', {
        instanceType: props.writerInstanceType,
        parameterGroup: instanceParameterGroup,
        enablePerformanceInsights: props.enablePerformanceInsights,
        performanceInsightEncryptionKey,
        performanceInsightRetention,
      }),
      readers: [
        rds.ClusterInstance.provisioned('reader1', {
          instanceType: props.readerInstanceType,
          parameterGroup: instanceParameterGroup,
          enablePerformanceInsights: props.enablePerformanceInsights,
          performanceInsightEncryptionKey,
          performanceInsightRetention,
        }),
      ],
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      defaultDatabaseName: props.dbName,
      storageEncrypted: true,
      storageEncryptionKey: props.appKey,
      cloudwatchLogsExports: props.cloudwatchLogsExports,
      cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,
    });

    // For Application connect
    if (props.appServerSecurityGroup) {
      this.cluster.connections.allowDefaultPortFrom(props.appServerSecurityGroup);
    }
    // For Bastion Container
    if (props.bastionSecurityGroup) {
      this.cluster.connections.allowDefaultPortFrom(props.bastionSecurityGroup);
    }

    // AWS Backup
    cdk.Tags.of(this.cluster).add('AWSBackup', 'True');
  }
}
