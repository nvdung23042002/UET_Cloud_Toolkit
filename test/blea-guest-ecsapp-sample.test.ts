import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DbAuroraStack } from '../lib/stack/db-aurora-stack';
import { WafCfStack } from '../lib/stack/waf-cloudfront-stack';
import { WafAlbStack } from '../lib/stack/waf-alb-stack';
import { ElastiCacheRedisStack } from '../lib/stack/elasticache-redis-stack';
import { IConfig } from '../params/interface';
import { OpenSearchStack } from '../lib/stack/opensearch-stack';
import { MonitorStack } from '../lib/stack/monitor-stack';
import { EcsAppStack } from '../lib/stack/ecs-app-stack';
import { CloudfrontStack } from '../lib/stack/cloudfront-stack';
import { OidcStack } from '../lib/stack/oidc-stack';
import { InfraResourcesPipelineStack } from '../lib/stack/pipeline-infraresources-stack';
import { ShareResourcesStack } from '../lib/stack/share-resources-stack';

// Account and Region on test
//  cdk.process.env.* returns undefined, and cdk.Stack.of(this).* returns ${Token[Region.4]} at test time.
//  In such case, RegionInfo.get(cdk.Stack.of(this).region) returns error and test will fail.
//  So we pass 'ap-northeast-1' as region code.
const procEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
};

const pjPrefix = 'BLEA';
const app = new cdk.App();

const envKey = 'dev';

const config: IConfig = require('../params/' + envKey);

function getProcEnv() {
  if (config.Env.account && config.Env.region) {
    return {
      account: config.Env.account,
      region: config.Env.region,
    };
  } else {
    return procEnv;
  }
}

describe(`${pjPrefix} Guest Stacks`, () => {
  test('GuestAccount ECS App Stacks', () => {
    // Slack Notifier
    const workspaceId = config.NotifierParam.workspaceId;
    const channelIdMon = config.NotifierParam.channelIdMon;

    // Share resources
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

    // Infrastructure pipeline
    const infraPipeline = new InfraResourcesPipelineStack(app, `${pjPrefix}-Pipeline`, {
      ...config.InfraResourcesPipelineParam,
      envKey,
      env: getProcEnv(),
    });

    const wafCloudfront = new WafCfStack(app, `${pjPrefix}-Waf`, {
      scope: 'CLOUDFRONT',
      env: {
        account: getProcEnv().account,
        region: 'us-east-1',
      },
      crossRegionReferences: true,
      ...config.WafParam,
    });

    const oidc = new OidcStack(app, `${pjPrefix}-OIDC`, {
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
      ecsBastionTasks: false,
      env: getProcEnv(),
      crossRegionReferences: true,
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
      appKey: shareResources.appKey,
      alarmTopic: shareResources.alarmTopic,
      ...config.AuroraParam,
      env: getProcEnv(),
    });

    // Monitor stack: dashboard
    const monitor = new MonitorStack(app, `${pjPrefix}-MonitorStack`, {
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
      // AutoScaleはCDK外で管理のため、固定値を修正要で設定
      ecsScaleOnRequestCount: 50,
      ecsTargetUtilizationPercent: 10000,
      env: getProcEnv(),
    });

    const opensearch = new OpenSearchStack(app, `${pjPrefix}-OpenSearch`, {
      vpc: shareResources.myVpc,
      appServerSecurityGroup: ecs.app.backEcsApps[0].securityGroupForFargate,
      openSearchType: 'PROVISION',
      ...config.OpensearchParam,
      env: getProcEnv(),
    });

    const elasticache = new ElastiCacheRedisStack(app, `${pjPrefix}-ElastiCacheRedis`, {
      myVpc: shareResources.myVpc,
      appKey: shareResources.appKey,
      alarmTopic: shareResources.alarmTopic,
      appServerSecurityGroup: ecs.app.backEcsApps[0].securityGroupForFargate,
      ...config.ElastiCacheRedisParam,
      env: getProcEnv(),
    });

    // Tagging "Environment" tag to all resources in this app
    const envTagName = 'Environment';
    cdk.Tags.of(app).add(envTagName, envKey);

    // test with snapshot
    expect(Template.fromStack(shareResources)).toMatchSnapshot();
    expect(Template.fromStack(infraPipeline)).toMatchSnapshot();
    expect(Template.fromStack(wafCloudfront)).toMatchSnapshot();
    expect(Template.fromStack(oidc)).toMatchSnapshot();
    expect(Template.fromStack(ecs)).toMatchSnapshot();
    expect(Template.fromStack(wafAlb)).toMatchSnapshot();
    expect(Template.fromStack(cloudfront)).toMatchSnapshot();
    expect(Template.fromStack(dbCluster)).toMatchSnapshot();
    expect(Template.fromStack(monitor)).toMatchSnapshot();
    expect(Template.fromStack(opensearch)).toMatchSnapshot();
    expect(Template.fromStack(elasticache)).toMatchSnapshot();
  });
});
