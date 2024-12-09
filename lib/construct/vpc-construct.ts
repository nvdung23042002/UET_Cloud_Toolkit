import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_kms as kms } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';

export interface VpcProps {
  /**
   * VPC CIDR
   *
   * @example - '10.0.0.0/16'
   */
  myVpcCidr: string;
  /**
   * VPC max AZs
   *
   * @default - 3
   */
  myVpcMaxAzs?: number;
}

export class Vpc extends Construct {
  public readonly myVpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    const myVpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.myVpcCidr),
      maxAzs: props.myVpcMaxAzs,
      natGateways: 2,
      flowLogs: {},
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 22,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 22,
          name: 'Protected',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    //  --------------------------------------------------------------
    //  Bucket for VPC Flow log

    // CMK
    const flowLogKey = new kms.Key(this, 'Key', {
      enableKeyRotation: true,
      description: 'for VPC Flow log',
      alias: `${id}-for-flowlog`,
    });
    flowLogKey.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
        principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
        resources: ['*'],
      }),
    );

    // Bucket
    const flowLogBucket = new s3.Bucket(this, 'FlowLogBucket', {
      accessControl: s3.BucketAccessControl.PRIVATE,
      encryptionKey: flowLogKey,
      encryption: s3.BucketEncryption.KMS,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enforceSSL: true,
    });

    myVpc.addFlowLog('FlowLogs', {
      destination: ec2.FlowLogDestination.toS3(flowLogBucket),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });
    this.myVpc = myVpc;

    //  --------------------------------------------------------------

    // NACL for Public Subnets
    const naclPublic = new ec2.NetworkAcl(this, 'NaclPublic', {
      vpc: myVpc,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Egress Rules for Public Subnets
    naclPublic.addEntry('NaclEgressPublic', {
      direction: ec2.TrafficDirection.EGRESS,
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      ruleAction: ec2.Action.ALLOW,
    });

    // Ingress Rules for Public Subnets
    naclPublic.addEntry('NaclIngressPublic', {
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      ruleAction: ec2.Action.ALLOW,
    });

    // NACL for Private Subnets
    const naclPrivate = new ec2.NetworkAcl(this, 'NaclPrivate', {
      vpc: myVpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Egress Rules for Private Subnets
    naclPrivate.addEntry('NaclEgressPrivate', {
      direction: ec2.TrafficDirection.EGRESS,
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      ruleAction: ec2.Action.ALLOW,
    });

    // Ingress Rules for Public Subnets
    naclPrivate.addEntry('NaclIngressPrivate', {
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 120,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
      ruleAction: ec2.Action.ALLOW,
    });

    // VPC Endpoint for S3
    myVpc.addGatewayEndpoint('S3EndpointForPrivate', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
    });

    // VPC Endpoint for SSM
    myVpc.addInterfaceEndpoint('SsmEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });
    myVpc.addInterfaceEndpoint('SsmMessagesEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });
    myVpc.addInterfaceEndpoint('Ec2EndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });
    myVpc.addInterfaceEndpoint('Ec2MessagesEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // VPC Endpoint for Fargate
    myVpc.addInterfaceEndpoint('EcrDkrEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });
    myVpc.addInterfaceEndpoint('EcrEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });
    myVpc.addInterfaceEndpoint('LogsEndpointForPrivate', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    //Private SubnetをOutput（run_task.shが参照）
    new cdk.CfnOutput(this, 'subnetID', {
      value: myVpc.selectSubnets({ subnetGroupName: 'Private' }).subnetIds[0],
    });
  }
}
