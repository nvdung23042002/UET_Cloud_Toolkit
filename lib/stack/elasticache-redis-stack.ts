import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as cwlog from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface ModuleStackProps extends cdk.StackProps {
  myVpc: ec2.Vpc;
  appKey: kms.IKey;
  alarmTopic: sns.Topic;
  appServerSecurityGroup: ec2.SecurityGroup;
  bastionSecurityGroup?: ec2.SecurityGroup;
  enableAutoScale: boolean;
  engineVersion: string;
  numNodeGroups: number;
  replicasPerNodeGroup: number;
  minCapacity: number;
  maxCapacity: number;
  targetValueToScale: number;
  predefinedMetricToScale: appscaling.PredefinedMetric;
  cacheNodeTypeEnableAutoScale: string;
  cacheNodeTypeDisableAutoScale: string;
  elastiCacheRedisCustomParam: elasticache.CfnParameterGroupProps;
}

export class ElastiCacheRedisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ModuleStackProps) {
    super(scope, id, props);

    const secret = new secretsmanager.CfnSecret(this, 'ElastiCacheRedisSecret', {});

    const logGroup = new cwlog.LogGroup(this, 'ElastiCacheRedisLoggroup', {
      retention: cwlog.RetentionDays.THREE_MONTHS,
    });

    const securityGroupForRedis = new ec2.SecurityGroup(this, 'ElastiCacheRedisSecuritygGroup', {
      vpc: props.myVpc,
    });
    // 1. 
    // securityGroupForRedis.connections.allowFrom(props.appServerSecurityGroup,ec2.Port.tcp(6379));
    // For Bastion Container
    if (props.bastionSecurityGroup) {
      securityGroupForRedis.connections.allowFrom(props.bastionSecurityGroup, ec2.Port.tcp(6379));
    }

    // 「2.
    // props.myVpc.selectSubnets({ subnets: props.myVpc.privateSubnets }).subnets.forEach((x:ec2.ISubnet) => {
    //   securityGroupForRedis.addIngressRule(ec2.Peer.ipv4(x.ipv4CidrBlock), ec2.Port.tcp(6379));
    // });

    const subnetgroup = new elasticache.CfnSubnetGroup(this, 'ElastiCacheRedisSubnetGroup', {
      cacheSubnetGroupName: cdk.Stack.of(this).stackName + '-Subnetgroup',
      description: 'for redis',
      subnetIds: props.myVpc.isolatedSubnets.map(({ subnetId }) => subnetId),
    });

    // ../elasticache-param-groupparams/config.ts
    const CustomParameterGroup = new elasticache.CfnParameterGroup(this, 'ElastiCacheRedisCustomParameterGroup', {
      ...props.elastiCacheRedisCustomParam,
    });

    const redis = new elasticache.CfnReplicationGroup(this, 'ElastiCacheRedis', {
      replicationGroupDescription: 'redis',
      atRestEncryptionEnabled: true,
      authToken: secret.secretString,
      automaticFailoverEnabled: true,
      cacheSubnetGroupName: subnetgroup.cacheSubnetGroupName,
      engine: 'redis',
      engineVersion: props.engineVersion,
      kmsKeyId: props.appKey.keyId,
      logDeliveryConfigurations: [
        {
          logType: 'slow-log',
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: logGroup.logGroupName,
            },
          },
          logFormat: 'json',
        },
      ],
      multiAzEnabled: true,
      notificationTopicArn: props.alarmTopic.topicArn,
      numNodeGroups: props.numNodeGroups,
      replicasPerNodeGroup: props.replicasPerNodeGroup,
      replicationGroupId: cdk.Stack.of(this).stackName + '-repGroup',
      securityGroupIds: [securityGroupForRedis.securityGroupId],
      transitEncryptionEnabled: true,
      cacheParameterGroupName: CustomParameterGroup.ref,
    });
    redis.addDependency(subnetgroup);
    redis.cfnOptions.updatePolicy = {
      useOnlineResharding: true,
    };
    if (props.enableAutoScale) {
      redis.cacheNodeType = props.cacheNodeTypeEnableAutoScale;
      const ScalableTarget = new appscaling.ScalableTarget(this, 'ElastiCacheRedisShardsScalableTarget', {
        serviceNamespace: appscaling.ServiceNamespace.ELASTICACHE,
        scalableDimension: 'elasticache:replication-group:NodeGroups',
        minCapacity: props.minCapacity,
        maxCapacity: props.maxCapacity,
        resourceId: `replication-group/${redis.replicationGroupId}`,
      });

      cdk.Aspects.of(ScalableTarget).add({
        visit(node) {
          if (node instanceof appscaling.CfnScalableTarget) {
            node.addDependency(redis);
          }
        },
      });

      ScalableTarget.scaleToTrackMetric('ElastiCacheRedisShardsCPUUtilization', {
        targetValue: props.targetValueToScale,
        predefinedMetric: props.predefinedMetricToScale,
      });
    } else {
      redis.cacheNodeType = props.cacheNodeTypeDisableAutoScale;
    }
  }
}
