import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Duration } from 'aws-cdk-lib';

export interface ICognitoParam {
  urlForCallback: string[];
  urlForLogout: string[];
  secretArn: string;
  identityProvider: typeof cognito.UserPoolClientIdentityProvider.COGNITO;
}

export interface IWafParam {
  defaultAction?: wafv2.CfnWebACL.DefaultActionProperty;
  basicAuthUserName?: string;
  basicAuthUserPass?: string;
  overrideAction_CommonRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_KnownBadInputsRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_AmazonIpReputationList?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_LinuxRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_SQLiRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_CSCRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  ruleAction_IPsetRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
  ruleAction_BasicRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
  allowIPList?: string[];
  preSharedKey?: string;
}
export interface IOidcParam {
  OrganizationName: string;
  RepositoryNames: Record<string, string>;
}

export interface IOpenSearchTypeParam {
  openSearchType: 'PROVISION' | 'SERVERLESS';
}

export interface IOpenSearchParam {
  openSearchProvisionedParam: {
    engineVersion: opensearch.EngineVersion;
    zoneAwareness: number;
    ebsVolumeType: ec2.EbsDeviceVolumeType;
    ebsVolumeSize: number;
    ebsIops: number;
    dataNodes: number;
    masterNodes: number;
    masterNodeInstanceType: string;
    dataNodeInstanceType: string;
  };
  openSearchServerlessParam: {
    collectionType: 'SEARCH' | 'TIMESERIES' | 'VECTORSEARCH';
  };
}

export interface IElastiCacheRedisParam {
  engineVersion: string;
  numNodeGroups: number;
  replicasPerNodeGroup: number;
  minCapacity: number;
  maxCapacity: number;
  targetValueToScale: number;
  predefinedMetricToScale:
    | appscaling.PredefinedMetric.ELASTICACHE_PRIMARY_ENGINE_CPU_UTILIZATION
    | appscaling.PredefinedMetric.ELASTICACHE_REPLICA_ENGINE_CPU_UTILIZATION
    | appscaling.PredefinedMetric.ELASTICACHE_DATABASE_MEMORY_USAGE_COUNTED_FOR_EVICT_PERCENTAGE;
  enableAutoScale: boolean;
  cacheNodeTypeEnableAutoScale: string;
  cacheNodeTypeDisableAutoScale: string;
  elastiCacheRedisCustomParam: elasticache.CfnParameterGroupProps;
}

export interface IAuroraParam {
  dbName: string;
  dbUser: string;
  dbVersion: rds.AuroraPostgresEngineVersion | rds.AuroraMysqlEngineVersion;
  writerInstanceType: ec2.InstanceType;
  readerInstanceType: ec2.InstanceType;
  enablePerformanceInsights: boolean;
  auroraMinAcu: number;
  auroraMaxAcu: number;
  clusterParameters?: Record<string, string>;
  instanceParameters?: Record<string, string>;
}

export interface ICertificateIdentifier {
  identifier: string;
}
export interface IBasicEcsAlbParam {
  appName: string;
  portNumber: number;
  lifecycleRules?: ecr.LifecycleRule[];
}

export interface IOptionalEcsAlbParam extends IBasicEcsAlbParam {
  path: string;
}

export type IEcsAlbParam = [IBasicEcsAlbParam, ...IOptionalEcsAlbParam[]];

export interface IEcsParam {
  appName: string;
  portNumber: number;
  lifecycleRules?: ecr.LifecycleRule[];
}

export interface INotifierParam {
  workspaceId: string;
  channelIdMon: string;
  monitoringNotifyEmail: string;
}

export interface ICloudFrontParam {
  fqdn: string;
  createClosedBucket: boolean;
}

export interface IEnv {
  envName: string;
  account?: string;
  region?: string;
}

export interface IDRRegion {
  region: string;
}

export interface IBackupParam {
  backupDisasterRecovery: boolean;
  backupSchedule: events.Schedule;
  retentionPeriod: Duration;
}

export interface IInfraResourcesPipelineParam {
  slackChannelName: string;
  slackWorkspaceId: string;
  slackChannelId: string;
}

export interface IBastionParam {
  lifecycleRules?: ecr.LifecycleRule[];
}


export interface IVpcParam {
  cidr: string;
  maxAzs: number;
}

export interface IS3Param {
  bucketName: string;
}

export interface IConfig {
  CognitoParam: ICognitoParam;
  WafParam: IWafParam;
  WafAlbParam: IWafParam;
  OidcParam: IOidcParam;
  AuroraParam: IAuroraParam;
  CertificateIdentifier: ICertificateIdentifier;
  AlbCertificateIdentifier: ICertificateIdentifier;
  AlbBgCertificateIdentifier: ICertificateIdentifier;
  OpensearchParam: IOpenSearchParam;
  OpensearchTypeParam: IOpenSearchTypeParam;
  ElastiCacheRedisParam: IElastiCacheRedisParam;
  EcsFrontTasks: IEcsAlbParam;
  EcsFrontBgTasks: IEcsAlbParam;
  EcsBackTasks: IEcsParam[];
  EcsBackBgTasks: IEcsAlbParam;
  VpcParam: IVpcParam;
  NotifierParam: INotifierParam;
  CloudFrontParam: ICloudFrontParam;
  InfraResourcesPipelineParam: IInfraResourcesPipelineParam;
  Env: IEnv;
  DRRegionParam: IDRRegion;
  BackupParam: IBackupParam;
  BastionParam?: IBastionParam;
  S3Param: IS3Param;
}

