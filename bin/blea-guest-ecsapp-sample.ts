import * as cdk from 'aws-cdk-lib';
import { DbAuroraStack } from '../lib/stack/db-aurora-stack';
import { WafCfStack } from '../lib/stack/waf-cloudfront-stack';
import { WafAlbStack } from '../lib/stack/waf-alb-stack';
import { ElastiCacheRedisStack } from '../lib/stack/elasticache-redis-stack';
import * as fs from 'fs';
import { IConfig } from '../params/interface';
import { StepFunctionsSampleStack } from '../lib/stack/stepfunctions-sample-stack';
import { OpenSearchStack } from '../lib/stack/opensearch-stack';
import { BackupVaultStack } from '../lib/stack/backup-vault-stack';
import { BackupPlanStack } from '../lib/stack/backup-plan-stack';
import { MonitorStack } from '../lib/stack/monitor-stack';
import { EcsAppStack } from '../lib/stack/ecs-app-stack';
import { Ec2Action } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { CloudfrontStack } from '../lib/stack/cloudfront-stack';
import { OidcStack } from '../lib/stack/oidc-stack';
import { InfraResourcesPipelineStack } from '../lib/stack/pipeline-infraresources-stack';
import { ShareResourcesStack } from '../lib/stack/share-resources-stack';
import { S3Stack } from '../lib/stack/s3-stack';

const app = new cdk.App();

// ----------------------- Load context variables ------------------------------
// This context need to be specified in args
const argContext = 'environment';
const envKey = app.node.tryGetContext(argContext);
if (envKey == undefined)
  throw new Error(`Please specify environment with context option. ex) cdk deploy -c ${argContext}=dev`);
//Read Typescript Environment file
const TsEnvPath = './params/' + envKey + '.ts';
if (!fs.existsSync(TsEnvPath)) throw new Error(`Can't find a ts environment file [../params/` + envKey + `.ts]`);

//ESLint
//https://github.com/mynavi-group/csys-infra-baseline-environment-on-aws-change-homemade/issues/29#issuecomment-1437738803
const config: IConfig = require('../params/' + envKey);

// Add envName to Stack for avoiding duplication of Stack names.
const pjPrefix = config.Env.envName + 'BLEA';

// ----------------------- Environment variables for stack ------------------------------
// Default environment
const procEnvDefault = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Define account id and region from context.
// If "env" isn't defined on the environment variable in context, use account and region specified by "--profile".
function getProcEnv() {
  if (config.Env.account && config.Env.region) {
    return {
      account: config.Env.account,
      region: config.Env.region,
    };
  } else {
    return procEnvDefault;
  }
}

// ----------------------- Guest System Stacks ------------------------------

// Slack Notifier
const workspaceId = config.NotifierParam.workspaceId;
const channelIdMon = config.NotifierParam.channelIdMon;

const shareResources = new ShareResourcesStack(app, `${pjPrefix}-ShareResources`, {
  pjPrefix,
  notifyEmail: config.NotifierParam.monitoringNotifyEmail,
  domainPrefix: `${pjPrefix}`.toLowerCase(),
  workspaceId: workspaceId,
  channelId: channelIdMon,
  ...config.CognitoParam,
  myVpcCidr: config.VpcParam.cidr,
  myVpcMaxAzs: config.VpcParam.maxAzs,
  env: getProcEnv(),
});

const s3Bucket = new S3Stack(app, `${pjPrefix}-S3`, {
  bucketName: config.S3Param.bucketName,
});

// InfraResources
new InfraResourcesPipelineStack(app, `${pjPrefix}-Pipeline`, {
  ...config.InfraResourcesPipelineParam,
  envKey,
  env: getProcEnv(),
});

const wafCloudfront = new WafCfStack(app, `${pjPrefix}-WafCloudfront`, {
  scope: 'CLOUDFRONT',
  env: {
    account: getProcEnv().account,
    region: 'us-east-1',
  },
  crossRegionReferences: true,
  ...config.WafParam,
});

new OidcStack(app, `${pjPrefix}-OIDC`, {
  OrganizationName: config.OidcParam.OrganizationName,
  RepositoryNames: config.OidcParam.RepositoryNames,
  env: getProcEnv(),
});

const ecs = new EcsAppStack(app, `${pjPrefix}-ECS`, {
  myVpc: shareResources.myVpc,
  appKey: shareResources.appKey,
  alarmTopic: shareResources.alarmTopic,
  prefix: pjPrefix,
  AlbBgCertificateIdentifier: config.AlbBgCertificateIdentifier,
  AlbCertificateIdentifier: config.AlbCertificateIdentifier,
  ecsFrontTasks: config.EcsFrontTasks,
  ecsFrontBgTasks: config.EcsFrontBgTasks,
  ecsBackBgTasks: config.EcsBackBgTasks,
  ecsBackTasks: config.EcsBackTasks,
  env: getProcEnv(),
  crossRegionReferences: true,
  bastionEcrLifecycleRules: config.BastionParam?.lifecycleRules,
});

const wafAlb = new WafAlbStack(app, `${pjPrefix}-WafAlb`, {
  scope: 'REGIONAL',
  associations: [ecs.app.frontAlb.appAlb.loadBalancerArn, ecs.app.frontAlbBg.appAlbBg.loadBalancerArn],
  env: getProcEnv(),
  crossRegionReferences: true,
  ...config.WafAlbParam,
});

const cloudfront = new CloudfrontStack(app, `${pjPrefix}-Cloudfront`, {
  pjPrefix: pjPrefix,
  webAcl: wafCloudfront.webAcl,
  CertificateIdentifier: config.CertificateIdentifier,
  cloudFrontParam: config.CloudFrontParam,
  appAlbs: [ecs.app.frontAlbBg.appAlbBg],
  preSharedKey: wafAlb.preSharedKey,
  env: getProcEnv(),
  crossRegionReferences: true,
});
cloudfront.addDependency(wafAlb);

// Aurora
const dbCluster = new DbAuroraStack(app, `${pjPrefix}-DBAurora`, {
  vpc: shareResources.myVpc,
  vpcSubnets: shareResources.myVpc.selectSubnets({
    subnetGroupName: 'Protected',
  }),
  appServerSecurityGroup: ecs.app.backEcsApps[0].securityGroupForFargate,
  // appServerSecurityGroup: ecs.app.backEcsAppsBg[0].securityGroupForFargate,
  bastionSecurityGroup: ecs.app.bastionApp.securityGroup,
  appKey: shareResources.appKey,
  alarmTopic: shareResources.alarmTopic,
  ...config.AuroraParam,
  env: getProcEnv(),
});

new MonitorStack(app, `${pjPrefix}-MonitorStack`, {
  pjPrefix: `${pjPrefix}`,
  dashboardName: `${pjPrefix}-ECSApp`,
  cfDistributionId: cloudfront.cfDistributionId,
  albFullName: ecs.app.frontAlb.appAlb.loadBalancerFullName,
  appTargetGroupNames: ecs.app.frontAlb.AlbTgs.map((AlbTg) => AlbTg.lbForAppTargetGroup.targetGroupName),
  albTgUnHealthyHostCountAlarms: ecs.app.frontAlb.AlbTgs.map((AlbTg) => AlbTg.albTgUnHealthyHostCountAlarm),
  ecsClusterName: ecs.app.ecsCommon.ecsCluster.clusterName,
  ecsAlbServiceNames: ecs.app.frontEcsApps.map((ecsAlbApp) => ecsAlbApp.ecsServiceName),
  ecsInternalServiceNames: ecs.app.backEcsApps.map((ecsInternalApp) => ecsInternalApp.ecsServiceName),
  dbClusterName: dbCluster.dbClusterName,
  // AutoScale
  ecsScaleOnRequestCount: 50,
  ecsTargetUtilizationPercent: 10000,
  env: getProcEnv(),
});

new OpenSearchStack(app, `${pjPrefix}-OpenSearch`, {
  vpc: shareResources.myVpc,
  appServerSecurityGroup: ecs.app.backEcsApps[0].securityGroupForFargate,
  bastionSecurityGroup: ecs.app.bastionApp.securityGroup,
  openSearchType: config.OpensearchTypeParam,
  openSearchProps: config.OpensearchParam,
  env: getProcEnv(),
});

new ElastiCacheRedisStack(app, `${pjPrefix}-ElastiCacheRedis`, {
  myVpc: shareResources.myVpc,
  appKey: shareResources.appKey,
  alarmTopic: shareResources.alarmTopic,
  appServerSecurityGroup: ecs.app.backEcsApps[0].securityGroupForFargate,
  // appServerSecurityGroup: ecs.app.backEcsAppsBg[0].securityGroupForFargate,
  bastionSecurityGroup: ecs.app.bastionApp.securityGroup,
  ...config.ElastiCacheRedisParam,
  env: getProcEnv(),
});

// Tagging "Environment" tag to all resources in this app
const envTagName = 'Environment';
cdk.Tags.of(app).add(envTagName, config.Env.envName);
