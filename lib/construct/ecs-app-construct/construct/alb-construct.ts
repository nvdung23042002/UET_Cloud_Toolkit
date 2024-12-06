import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_sns as sns } from 'aws-cdk-lib';
import { aws_cloudwatch as cw } from 'aws-cdk-lib';
import { aws_cloudwatch_actions as cw_actions } from 'aws-cdk-lib';
import { region_info as ri } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import { EcsappConstruct } from './ecs-app-construct';
import { AlbtgConstruct } from './alb-target-group-construct';
import { IEcsAlbParam, ICertificateIdentifier, IOptionalEcsAlbParam } from '../../../../params/interface';
import { AwsManagedPrefixList } from '../../aws-managed-prefixlist';

interface AlbConstructProps extends cdk.StackProps {
  /**
   * Application Load Balancer's VPC
   */
  myVpc: ec2.Vpc;
  /**
   * SNS topic ARN for sending alarm
   */
  alarmTopic: sns.Topic;
  /**
   * ECS applications mapping to Application Load Balancer target groups
   */
  ecsApps: IEcsAlbParam;
  /**
   * Ceritificate ID for Application Load Balancer
   */
  AlbCertificateIdentifier: ICertificateIdentifier;
  /**
   * Whether to open Listener's port on Application Load Balancer Security Group
   *
   * @default - false
   */
  albListenerOpenFlag?: boolean;
}

export class AlbConstruct extends Construct {
  public readonly appAlb: elbv2.ApplicationLoadBalancer;
  public readonly appAlbListerner: elbv2.ApplicationListener;
  public readonly appAlbSecurityGroup: ec2.SecurityGroup;
  public readonly webContentsBucket: s3.Bucket;
  public readonly cfDistribution: cloudfront.Distribution;
  public readonly ecsAlbApps: EcsappConstruct[];
  public readonly AlbTgs: AlbtgConstruct[];

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    //Check if a certificate is specified
    const hasValidAlbCert = props.AlbCertificateIdentifier.identifier !== '';

    // for ELB (Local regional Cert)
    const albCertificateArn = `arn:aws:acm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:certificate/${
      props.AlbCertificateIdentifier.identifier
    }`;
    const albCert = acm.Certificate.fromCertificateArn(this, 'albCertificate', albCertificateArn);

    // --- Security Groups ---

    //Security Group of ALB for App
    const securityGroupForAlb = new ec2.SecurityGroup(this, 'SgAlb', {
      vpc: props.myVpc,
      allowAllOutbound: true,
    });
    this.appAlbSecurityGroup = securityGroupForAlb;

    const cloudfrontPrefixListID = new AwsManagedPrefixList(this, 'CloudfrontOriginPrefixList', {
      prefixlistName: 'com.amazonaws.global.cloudfront.origin-facing',
    }).prefixListID;

    if (hasValidAlbCert) {
      securityGroupForAlb.addIngressRule(
        ec2.Peer.prefixList(cloudfrontPrefixListID),
        ec2.Port.tcp(443),
        'Allow inbound traffic from AWS managed cloudfront prefixlist',
      );
    } else {
      securityGroupForAlb.addIngressRule(
        ec2.Peer.prefixList(cloudfrontPrefixListID),
        ec2.Port.tcp(80),
        'Allow inbound traffic from AWS managed cloudfront prefixlist',
      );
    }

    // ------------ Application LoadBalancer ---------------

    // ALB for App Server
    const lbForApp = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.myVpc,
      internetFacing: true,
      securityGroup: securityGroupForAlb,
      vpcSubnets: props.myVpc.selectSubnets({
        subnetGroupName: 'Public',
      }),
    });
    this.appAlb = lbForApp;

    let lbForAppListener: elbv2.ApplicationListener;
    if (hasValidAlbCert) {
      lbForAppListener = lbForApp.addListener('app', {
        port: 443,
        open: props.albListenerOpenFlag,
        certificates: [
          {
            certificateArn: albCert.certificateArn,
          },
        ],
        sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
      });

      // (mynavi mod) create redirect listener.
      const redirectListener = lbForApp.addListener('redirect', {
        port: 80,
        open: props.albListenerOpenFlag,
        defaultAction: elbv2.ListenerAction.redirect({
          port: '443',
          protocol: 'HTTPS',
          permanent: true,
        }),
      });
      redirectListener.node.addDependency(lbForAppListener);
    } else {
      lbForAppListener = lbForApp.addListener('app', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        open: props.albListenerOpenFlag,
      });
    }
    this.appAlbListerner = lbForAppListener;

    // Enable ALB Access Logging
    //
    // This bucket can not be encrypted with KMS CMK
    // See: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-logging-bucket-permissions
    //
    const albLogBucket = new s3.Bucket(this, 'alb-log-bucket', {
      accessControl: s3.BucketAccessControl.PRIVATE,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enforceSSL: true,
    });

    lbForApp.setAttribute('access_logs.s3.enabled', 'true');
    lbForApp.setAttribute('access_logs.s3.bucket', albLogBucket.bucketName);

    // Permissions for Access Logging
    //    Why don't use bForApp.logAccessLogs(albLogBucket); ?
    //    Because logAccessLogs add wider permission to other account (PutObject*). S3 will become Noncompliant on Security Hub [S3.6]
    //    See: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-fsbp-controls.html#fsbp-s3-6
    //    See: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-logging-bucket-permissions
    albLogBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
        // ALB access logging needs S3 put permission from ALB service account for the region
        principals: [new iam.AccountPrincipal(ri.RegionInfo.get(cdk.Stack.of(this).region).elbv2Account)],
        resources: [albLogBucket.arnForObjects(`AWSLogs/${cdk.Stack.of(this).account}/*`)],
      }),
    );
    albLogBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
        principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
        resources: [albLogBucket.arnForObjects(`AWSLogs/${cdk.Stack.of(this).account}/*`)],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      }),
    );
    albLogBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetBucketAcl'],
        principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
        resources: [albLogBucket.bucketArn],
      }),
    );

    // Alarm for ALB - ResponseTime
    lbForApp.metrics
      .targetResponseTime({
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.AVERAGE,
      })
      .createAlarm(this, 'AlbResponseTime', {
        evaluationPeriods: 3,
        threshold: 100,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));

    // Alarm for ALB - HTTP 4XX Count
    lbForApp.metrics
      .httpCodeElb(elbv2.HttpCodeElb.ELB_4XX_COUNT, {
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.SUM,
      })
      .createAlarm(this, 'AlbHttp4xx', {
        evaluationPeriods: 3,
        threshold: 10,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));

    // Alarm for ALB - HTTP 5XX Count
    lbForApp.metrics
      .httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, {
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.SUM,
      })
      .createAlarm(this, 'AlbHttp5xx', {
        evaluationPeriods: 3,
        threshold: 10,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));

    this.AlbTgs = props.ecsApps.map((ecsApp, index) => {
      return new AlbtgConstruct(this, `${ecsApp.appName}-TG`, {
        myVpc: props.myVpc,
        alarmTopic: props.alarmTopic,
        appAlbListener: lbForAppListener,
        path: (ecsApp as IOptionalEcsAlbParam).path,
        priority: index,
        targetGroupPort: ecsApp.portNumber,
      });
    });
  }
}
