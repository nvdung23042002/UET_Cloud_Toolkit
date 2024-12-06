import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as events from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';
import * as inf from './interface';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';

export const CognitoParam: inf.ICognitoParam = {
  urlForCallback: ['http://xxx/auth/callback'],
  urlForLogout: ['http://xxx/auth/logout'],
  secretArn: 'arn:aws:secretsmanager:xxx',
  identityProvider: cognito.UserPoolClientIdentityProvider.GOOGLE,
};

export const WafParam: inf.IWafParam = {
  basicAuthUserName: 'admin',
  basicAuthUserPass: 'pass',
  overrideAction_CommonRuleSet: { count: {} },
  overrideAction_KnownBadInputsRuleSet: { count: {} },
  overrideAction_AmazonIpReputationList: { count: {} },
  overrideAction_LinuxRuleSet: { count: {} },
  overrideAction_SQLiRuleSet: { count: {} },
  overrideAction_CSCRuleSet: { count: {} },
  ruleAction_IPsetRuleSet: { allow: {} },
  ruleAction_BasicRuleSet: {
    block: {
      customResponse: {
        responseCode: 401,
        responseHeaders: [
          {
            name: 'www-authenticate',
            value: 'Basic',
          },
        ],
      },
    },
  },
  allowIPList: ['210.190.113.128/25'],
};

export const WafAlbParam: inf.IWafParam = {
  allowIPList: ['210.190.113.128/25'],
  preSharedKey: 'pre-string-for-preSharedKey'
};

export const OidcParam: inf.IOidcParam = {
  OrganizationName: 'OrganizationName', 
  RepositoryNames: { WafRepositoryName: 'WafRepositoryName', InfraRepositoryName: 'InfraRepositoryName' },
};

export const OpensearchParam: inf.IOpenSearchParam = {
  openSearchProvisionedParam: {
    engineVersion: opensearch.EngineVersion.OPENSEARCH_1_3,
    zoneAwareness: 3,
    ebsVolumeType: ec2.EbsDeviceVolumeType.GP3,
    ebsVolumeSize: 20,
    ebsIops: 5000,
    dataNodes: 3,
    masterNodes: 3,
    masterNodeInstanceType: 't3.medium.search',
    dataNodeInstanceType: 't3.medium.search',
  },
  openSearchServerlessParam: {
    collectionType: 'SEARCH',
  },
};

export const OpensearchTypeParam: inf.IOpenSearchTypeParam = {
  openSearchType: 'PROVISION',
};

export const ElastiCacheRedisParam: inf.IElastiCacheRedisParam = {
  engineVersion: '6.2',
  numNodeGroups: 3,
  replicasPerNodeGroup: 2,
  minCapacity: 3,
  maxCapacity: 12,
  targetValueToScale: 70,
  predefinedMetricToScale: appscaling.PredefinedMetric.ELASTICACHE_PRIMARY_ENGINE_CPU_UTILIZATION,
  enableAutoScale: false,
  cacheNodeTypeEnableAutoScale: 'cache.m5.large',
  cacheNodeTypeDisableAutoScale: 'cache.t3.small',
  elastiCacheRedisCustomParam: {
    cacheParameterGroupFamily: 'redis6.x',
    description: 'CustomParameterGroupForRedis',
    properties: {
      'cluster-enabled': 'yes',
    },
  },
};

export const AuroraParam: inf.IAuroraParam = {
  dbName: 'mydbname',
  dbUser: 'dbUser',
  dbVersion: rds.AuroraMysqlEngineVersion.VER_3_04_1,
  // dbVersion: rds.AuroraPostgresEngineVersion.VER_15_4,
  writerInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
  readerInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
  enablePerformanceInsights: false,
  auroraMinAcu: 2,
  auroraMaxAcu: 16,
  //ParameterGroupforMySQL
  clusterParameters: {
    time_zone: 'Asia/Tokyo',
    character_set_client: 'utf8mb4',
    character_set_connection: 'utf8mb4',
    character_set_database: 'utf8mb4',
    character_set_results: 'utf8mb4',
    character_set_server: 'utf8mb4',
    init_connect: 'SET NAMES utf8mb4',
    binlog_format: 'ROW',
  },
  instanceParameters: {
    slow_query_log: '1',
    long_query_time: '10',
  },
  //ParameterGroupforPostgreSQL
  // clusterParameters: {
  //   timezone: 'Asia/Tokyo',
  //   client_encoding: 'UTF8',
  //   binlog_format: 'ROW',
  // },
  // instanceParameters: {
  //   shared_preload_libraries: 'auto_explain,pg_stat_statements,pg_hint_plan,pgaudit',
  //   log_statement: 'ddl',
  //   log_connections: '1',
  //   log_disconnections: '1',
  //   log_lock_waits: '1',
  //   log_min_duration_statement: '5000',
  //   'auto_explain.log_min_duration': '5000',
  //   'auto_explain.log_verbose': '1',
  //   log_rotation_age: '1440',
  //   log_rotation_size: '102400',
  //   'rds.log_retention_period': '10080',
  //   random_page_cost: '1',
  //   track_activity_query_size: '16384',
  //   idle_in_transaction_session_timeout: '7200000',
  //   statement_timeout: '7200000',
  //   search_path: '"$user",public',
  // },
};

//Used when creating front-end stacks
export const CertificateIdentifier: inf.ICertificateIdentifier = {
  identifier: '',
};

export const AlbCertificateIdentifier: inf.ICertificateIdentifier = {
  identifier: '',
};
export const AlbBgCertificateIdentifier: inf.ICertificateIdentifier = {
  identifier: '',
};

export const EcsFrontTasks: inf.IEcsAlbParam = [
  {
    appName: 'EcsApp',
    portNumber: 80,
  },
  {
    appName: 'EcsApp2',
    portNumber: 80,
    path: '/path',
  },
];


export const EcsFrontBgTasks: inf.IEcsAlbParam = [
  {
    appName: 'EcsAppBg',
    portNumber: 80,
  },
  {
    appName: 'EcsApp2Bg',
    portNumber: 80,
    path: '/path',
  },
];


export const EcsBackTasks: inf.IEcsParam[] = [
  {
    appName: 'EcsBackend',
    portNumber: 8080,
  },
  {
    appName: 'EcsBackend2',
    portNumber: 8080,
  },
];

export const EcsBackBgTasks: inf.IEcsAlbParam = [
  {
    appName: 'EcsBackendBg',
    portNumber: 8080,
  },
  {
    appName: 'EcsBackend2Bg',
    portNumber: 8080,
    path: '/path',
  },
];

export const VpcParam: inf.IVpcParam = {
  cidr: '10.100.0.0/16',
  maxAzs: 3,
};

export const S3Param: inf.IS3Param = {
  bucketName: 'uet-cloudtoolkit-fe',
};

export const NotifierParam: inf.INotifierParam = {
  workspaceId: 'T8XXXXXXX',
  channelIdMon: 'C01YYYYYYYY',
  monitoringNotifyEmail: 'notify-monitoring@example.com',
};

export const CloudFrontParam: inf.ICloudFrontParam = {
  fqdn: '',
  createClosedBucket: true,
};

export const Env: inf.IEnv = {
  envName: 'Dev',
};

export const DRRegionParam: inf.IDRRegion = {
  region: 'ap-southeast-1',
};


//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html
//https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html
export const BackupParam: inf.IBackupParam = {
  backupDisasterRecovery: false,
  retentionPeriod: Duration.days(14),
  backupSchedule: events.Schedule.cron({
    minute: '0',
    hour: '2',
    day: '*',
    month: '*',
    year: '*',
  }),
};

export const InfraResourcesPipelineParam: inf.IInfraResourcesPipelineParam = {
  slackChannelName: 'YOUR_CHANNEL_NAME',
  slackWorkspaceId: 'YOUR_SLACK_WORKSPACE_ID',
  slackChannelId: 'YOUR_SLACK_CHANNEL_ID',
};

export const BastionParam: inf.IBastionParam = {
  lifecycleRules: [
    {
      description: 'Keep last 5 images',
      maxImageCount: 5,
    },
  ],
};

