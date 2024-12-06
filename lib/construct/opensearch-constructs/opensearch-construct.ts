import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface OpenSearchProps {
  /**
   * The VPC.
   */
  readonly vpc: ec2.Vpc;

  /**
   * The security group for the OpenSearch domain.
   */
  readonly domainSecurityGroup: ec2.SecurityGroup;

  /**
   * The OpenSearch engine version.
   */
  readonly engineVersion: opensearch.EngineVersion;

  /**
   * The number of availability zones for the domain.
   *
   * @default - no zone awareness (1 AZ)
   */
  readonly zoneAwareness: number;

  /**
   * The EBS volume size in GB.
   *
   * @default 10
   */
  readonly ebsVolumeSize: number;

  /**
   * The EBS volume type.
   *
   * @default gp2
   */
  readonly ebsVolumeType: ec2.EbsDeviceVolumeType;

  /**
   * The EBS IOPS.
   *
   * @default - No IOPS are set.
   */
  readonly ebsIops: number;

  /**
   * The number of data nodes.
   *
   * @default 1
   */
  readonly dataNodes: number;

  /**
   * The number of master nodes.
   *
   * @default - no dedicated master nodes
   */
  readonly masterNodes: number;

  /**
   * The data node instance type.
   *
   * @default - r5.large.search
   */
  readonly dataNodeInstanceType: string;

  /**
   * The master node instance type.
   *
   * @default - r5.large.search
   */
  readonly masterNodeInstanceType: string;
}

export class OpenSearch extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    const domain = new opensearch.Domain(this, cdk.Stack.of(this).stackName + 'OpenSearch', {
      version: props.engineVersion,
      vpc: props.vpc,
      zoneAwareness: {
        availabilityZoneCount: props.zoneAwareness,
        enabled: true,
      },
      ebs: {
        enabled: true,
        volumeSize: props.ebsVolumeSize,
        volumeType: props.ebsVolumeType,
        iops: props.ebsIops,
      },
      securityGroups: [props.domainSecurityGroup],
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
      capacity: {
        dataNodes: props.dataNodes,
        masterNodes: props.masterNodes,
        dataNodeInstanceType: props.dataNodeInstanceType,
        masterNodeInstanceType: props.masterNodeInstanceType,
      },
      encryptionAtRest: { enabled: true },
      enableVersionUpgrade: true,
      tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
      enforceHttps: true,
      logging: {
        slowIndexLogEnabled: true,
        appLogEnabled: true,
        slowSearchLogEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // OpenSearch
    // const rolePolicy = new iam.PolicyStatement({
    //   actions: ["es:ESHttp*"],
    //   resources: [domain.domainArn + '/*'],
    //   effect: iam.Effect.ALLOW,
    // });
    //  IAM
    // const ecsRole = new iam.Role(this, "ecsRole", {
    //   assumedBy: new iam.ServicePrincipal('ecs.amazonaws.com'),
    // });
    // ecsRole.addToPolicy(rolePolicy);

    // ESHttpDelete ESHttpGet ESHttpPatch ESHttpPost ESHttpPut
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html#ac-reference
    //  const esPolicy = new iam.PolicyStatement({
    //   actions:["es:ESHttp*",],
    //   resources:[domain.domainArn +'/*'],
    //   principals:[batchRole],
    //   effect:iam.Effect.ALLOW,
    // });
    // domain.addAccessPolicies(esPolicy);
  }
}
