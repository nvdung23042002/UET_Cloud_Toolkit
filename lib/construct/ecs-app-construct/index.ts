import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { EcsappConstruct } from './construct/ecs-app-construct';
import { EcsCommonConstruct } from './construct/ecs-common-construct';
import { PipelineBgConstruct } from './construct/pipeline-blue-green-construct';
import { PipelineEcspressoConstruct } from './construct/pipeline-ecspresso-construct';
import { AlbConstruct } from './construct/alb-construct';
import { AlbBgConstruct } from './construct/alb-blue-green-construct';
import { EcsServiceConstruct } from './construct/ecs-service-construct';
import { IEcsAlbParam, IEcsParam, ICertificateIdentifier } from '../../../params/interface';
import { BastionECSAppConstruct } from './construct/bastion-ecs-construct';
import { EcsTaskRole } from './construct/ecs-task-role-construct';

interface EcsAppProps {
  /**
   * ECS application VPC
   */
  myVpc: ec2.Vpc;
  /**
   * KMS key for encryption
   */
  appKey: kms.IKey;
  /**
   * SNS topic ARN for sending alarm
   */
  alarmTopic: sns.Topic;
  /**
   * Project and environment prefix
   */
  prefix: string;
  /**
   * Ceritificate ID for Application Load Balancer
   */
  AlbCertificateIdentifier: ICertificateIdentifier;
  /**
   * Ceritificate ID for Application Load Balancer blue green
   */
  AlbBgCertificateIdentifier: ICertificateIdentifier;
  /**
   * ECS frontend tasks parameters
   *
   * @example - [{ appName: 'EcsApp', portNumber: 80, path: '/path', lifecycleRules: [{ description: 'Keep last 30 images', maxImageCount: 30 }]}]
   */
  ecsFrontTasks: IEcsAlbParam;
  /**
   * ECS frontend tasks parameters for mode blue green
   *
   * @example - [{ appName: 'EcsApp', portNumber: 80, path: '/path'}]
   */
  ecsFrontBgTasks: IEcsAlbParam;
  /**
   * ECS backend tasks parameters
   *
   * @example - [{ appName: 'EcsBackend', portNumber: 8080, path: '/path}]
   */
  ecsBackTasks: IEcsParam[];
  /**
   * ECS backend tasks parameters for mode blue green
   *
   * @example - [{ appName: 'EcsBackendbg', portNumber: 8080, path: '/path'}]
   */
  ecsBackBgTasks: IEcsAlbParam;
  /**
   * Whether to create ECS bastion task
   *
   * @default - false
   */
  ecsBastionTasks?: boolean;
  /**
   * Bastion ECR lifecycle rule
   * @default Keep last 10 images
   */
  bastionEcrLifecycleRules?: ecr.LifecycleRule[];
  /**
   * Whether to open Listener's port on Application Load Balancer Security Group
   *
   * @default - false
   */
  albListenerOpenFlag?: boolean;
}

export class EcsApp extends Construct {
  public readonly frontAlb: AlbConstruct;
  public readonly frontAlbBg: AlbBgConstruct;
  public readonly frontEcsApps: EcsappConstruct[];
  public readonly frontEcsAppsBg: EcsappConstruct[];
  public readonly backendAlbBg: AlbBgConstruct;
  public readonly backEcsApps: EcsappConstruct[];
  public readonly backEcsAppsBg: EcsappConstruct[];
  public readonly ecsCommon: EcsCommonConstruct;
  public readonly bastionApp: BastionECSAppConstruct;

  constructor(scope: Construct, id: string, props: EcsAppProps) {
    super(scope, id);

    //ECS Common
    const ecsCommon = new EcsCommonConstruct(this, `${props.prefix}-ECSCommon`, {
      myVpc: props.myVpc,
      alarmTopic: props.alarmTopic,
      prefix: props.prefix,

      // -- SAMPLE: Pass your own ECR repository and your own image
      //  repository: ecr.repository,
      //  imageTag: build_container.imageTag,
    });
    this.ecsCommon = ecsCommon;

    // ECSサービスパターン1. Frontend Rolling
    // CloudFront + Public ALB + ECS resources(Repo, Log Group, SG, CloudWatch) + ecspresso(Rolling update) Pipeline
    // ※ECSサービスはパイプラインのecspressoコマンドにて作成
    if (props.ecsFrontTasks) {
      //Create Origin Resources
      const frontAlb = new AlbConstruct(this, `${props.prefix}-FrontAlb`, {
        myVpc: props.myVpc,
        alarmTopic: props.alarmTopic,
        AlbCertificateIdentifier: props.AlbCertificateIdentifier,
        ecsApps: props.ecsFrontTasks,
        albListenerOpenFlag: props.albListenerOpenFlag,
      });
      this.frontAlb = frontAlb;

      const frontEcsApps = props.ecsFrontTasks.map((ecsApp) => {
        return new EcsappConstruct(this, `${props.prefix}-${ecsApp.appName}-FrontApp-Ecs-Resources`, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          appName: ecsApp.appName,
          prefix: props.prefix,
          appKey: props.appKey,
          alarmTopic: props.alarmTopic,
          allowFromSG: [frontAlb.appAlbSecurityGroup],
          portNumber: ecsApp.portNumber,
          ecrLifecycleRules: ecsApp.lifecycleRules,
        });
      });
      this.frontEcsApps = frontEcsApps;

      //Pipeline for Frontend Rolling
      frontEcsApps.forEach((ecsApp, index) => {
        const ecsTaskRole = new EcsTaskRole(this, `${props.prefix}-${ecsApp.appName}-EcsTaskRole`, {
          appName: ecsApp.ecsServiceName,
          prefix: props.prefix,
          // Change policyStatements if you want to add a policy to the task role
          policyStatements: [],
          // Provide managed policy to add role if needed
          managedPolicy: [],
        });

        new PipelineEcspressoConstruct(this, `${props.prefix}-${ecsApp.appName}-FrontApp-Pipeline`, {
          prefix: props.prefix,
          appName: ecsApp.appName,
          ecsCluster: ecsCommon.ecsCluster,
          ecsServiceName: ecsApp.ecsServiceName,
          targetGroup: frontAlb.AlbTgs[index].lbForAppTargetGroup,
          securityGroup: ecsApp.securityGroupForFargate,
          myVpc: props.myVpc,
          logGroup: ecsApp.fargateLogGroup,
          ecsNameSpace: ecsCommon.ecsNameSpace,
          executionRole: ecsCommon.ecsTaskExecutionRole,
          taskRole: ecsTaskRole.role,
          portNumber: ecsApp.portNumber,
        });
      });
    }

    // Backend Rolling
    // ECS resources(Repo, Log Group, SG, CloudWatch) + ecspresso(Rolling update) Pipeline
    if (props.ecsBackTasks) {
      const backEcsApps = props.ecsBackTasks.map((ecsApp) => {
        return new EcsappConstruct(this, `${props.prefix}-${ecsApp.appName}-BackApp-Ecs-Resources`, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          appName: ecsApp.appName,
          prefix: props.prefix,
          appKey: props.appKey,
          alarmTopic: props.alarmTopic,
          allowFromSG: this.frontEcsApps.map((ecsAlbApp) => ecsAlbApp.securityGroupForFargate),
          portNumber: ecsApp.portNumber,
          useServiceConnect: true,
          ecrLifecycleRules: ecsApp.lifecycleRules,
        });
      });
      this.backEcsApps = backEcsApps;

      //Pipeline for Backend Rolling
      backEcsApps.forEach((ecsApp) => {
        const ecsTaskRole = new EcsTaskRole(this, `${props.prefix}-${ecsApp.appName}-EcsTaskRole`, {
          appName: ecsApp.ecsServiceName,
          prefix: props.prefix,
          // Change policyStatements if you want to add a policy to the task role
          policyStatements: [],
          // Provide managed policy to add role if needed
          managedPolicy: [],
        });

        new PipelineEcspressoConstruct(this, `${props.prefix}-${ecsApp.appName}-BackApp-Pipeline`, {
          prefix: props.prefix,
          appName: ecsApp.appName,
          ecsCluster: ecsCommon.ecsCluster,
          ecsServiceName: ecsApp.ecsServiceName,
          securityGroup: ecsApp.securityGroupForFargate,
          myVpc: props.myVpc,
          logGroup: ecsApp.fargateLogGroup,
          logGroupForServiceConnect: ecsApp.serviceConnectLogGroup,
          ecsNameSpace: ecsCommon.ecsNameSpace,
          executionRole: ecsCommon.ecsTaskExecutionRole,
          taskRole: ecsTaskRole.role,
          portNumber: ecsApp.portNumber,
        });
      });
    }

    // Frontend Blue/Green
    // CloudFront + Public ALB + ECS resources(Repo, Log Group, SG, CloudWatch) + ECS Service + Blue/Green Pipeline
    if (props.ecsFrontBgTasks) {
      //Create Origin Resources
      const frontAlbBg = new AlbBgConstruct(this, `${props.prefix}-Frontend-Bg`, {
        myVpc: props.myVpc,
        alarmTopic: props.alarmTopic,
        AlbBgCertificateIdentifier: props.AlbBgCertificateIdentifier,
        ecsApps: props.ecsFrontBgTasks,
        internetFacing: true,
        subnetGroupName: 'Public',
        albListenerOpenFlag: props.albListenerOpenFlag,
      });
      this.frontAlbBg = frontAlbBg;

      const frontEcsAppsBg = props.ecsFrontBgTasks.map((ecsApp) => {
        return new EcsappConstruct(this, `${props.prefix}-${ecsApp.appName}-FrontApp-Ecs-Resources-Bg`, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          appName: ecsApp.appName,
          prefix: props.prefix,
          appKey: props.appKey,
          alarmTopic: props.alarmTopic,
          allowFromSG: [frontAlbBg.appAlbSecurityGroup],
          portNumber: ecsApp.portNumber,
          ecrLifecycleRules: ecsApp.lifecycleRules,
        });
      });
      this.frontEcsAppsBg = frontEcsAppsBg;

      const frontEcsServices = frontEcsAppsBg.map((ecsApp) => {
        return new EcsServiceConstruct(this, ecsApp.ecsServiceName, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          ecsServiceName: ecsApp.ecsServiceName,
          // Change ecsTaskRolePolicyStatements if you want to add a policy to the task role
          ecsTaskRolePolicyStatements: [],
          ecsTaskExecutionRole: ecsCommon.ecsTaskExecutionRole,
          securityGroupForFargate: ecsApp.securityGroupForFargate,
          prefix: props.prefix,
        });
      });

      //ALB Target Group(Blue)
      frontAlbBg.AlbTgsBlue.forEach((AlbTg, index) => {
        AlbTg.lbForAppTargetGroup.addTarget(frontEcsServices[index].ecsService);
      });

      //Pipeline for Frontend Blue/Green
      frontEcsAppsBg.forEach((ecsApp, index) => {
        new PipelineBgConstruct(this, `${props.prefix}-${ecsApp.appName}-FrontApp-Bg-Pipeline`, {
          appName: ecsApp.appName,
          ecsService: frontEcsServices[index].ecsService,
          listener: frontAlbBg.ALbListenerBlue,
          testListener: frontAlbBg.ALbListenerGreen,
          blueTargetGroup: frontAlbBg.AlbTgsBlue[index].lbForAppTargetGroup,
          greenTargetGroup: frontAlbBg.AlbTgsGreen[index].lbForAppTargetGroup,
        });
      });
    }

    // ECS Backend Blue/Green
    // Private ALB + ECS resources(Repo, Log Group, SG, CloudWatch) + ECS Service + Blue/Green Pipeline
    if (props.ecsBackBgTasks) {
      //Create Origin Resources
      const backendAlbBg = new AlbBgConstruct(this, `${props.prefix}-Backend-Bg`, {
        myVpc: props.myVpc,
        alarmTopic: props.alarmTopic,
        httpFlag: true,
        AlbBgCertificateIdentifier: props.AlbBgCertificateIdentifier,
        ecsApps: props.ecsBackBgTasks,
        internetFacing: false,
        allowFromSG: this.frontEcsAppsBg.map((ecsAlbApp) => ecsAlbApp.securityGroupForFargate),
        subnetGroupName: 'Private',
        albListenerOpenFlag: props.albListenerOpenFlag,
      });
      this.backendAlbBg = backendAlbBg;

      const backEcsAppsBg = props.ecsBackBgTasks.map((ecsApp) => {
        return new EcsappConstruct(this, `${props.prefix}-${ecsApp.appName}-BackApp-Ecs-Resources-Bg`, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          appName: ecsApp.appName,
          prefix: props.prefix,
          appKey: props.appKey,
          alarmTopic: props.alarmTopic,
          allowFromSG: [backendAlbBg.appAlbSecurityGroup],
          portNumber: ecsApp.portNumber,
          ecrLifecycleRules: ecsApp.lifecycleRules,
        });
      });
      this.backEcsAppsBg = backEcsAppsBg;

      const backEcsServices = backEcsAppsBg.map((ecsApp) => {
        return new EcsServiceConstruct(this, ecsApp.ecsServiceName, {
          myVpc: props.myVpc,
          ecsCluster: ecsCommon.ecsCluster,
          ecsServiceName: ecsApp.ecsServiceName,
          // Change ecsTaskRolePolicyStatements if you want to add a policy to the task role
          ecsTaskRolePolicyStatements: [],
          ecsTaskExecutionRole: ecsCommon.ecsTaskExecutionRole,
          securityGroupForFargate: ecsApp.securityGroupForFargate,
          prefix: props.prefix,
        });
      });

      //ALB Target Group(Blue)
      backendAlbBg.AlbTgsBlue.forEach((AlbTg, index) => {
        AlbTg.lbForAppTargetGroup.addTarget(backEcsServices[index].ecsService);
      });

      // Pipeline for Backend Blue/Green
      backEcsAppsBg.forEach((ecsApp, index) => {
        new PipelineBgConstruct(this, `${props.prefix}-${ecsApp.appName}-BackApp-Bg-Pipeline`, {
          appName: ecsApp.appName,
          ecsService: backEcsServices[index].ecsService,
          listener: backendAlbBg.ALbListenerBlue,
          testListener: backendAlbBg.ALbListenerGreen,
          blueTargetGroup: backendAlbBg.AlbTgsBlue[index].lbForAppTargetGroup,
          greenTargetGroup: backendAlbBg.AlbTgsGreen[index].lbForAppTargetGroup,
        });
      });
    }
    //Bastion Container
    if (props.ecsBastionTasks) {
      const bastionApp = new BastionECSAppConstruct(this, `${props.prefix}-Bastion-ECSAPP`, {
        myVpc: props.myVpc,
        appKey: props.appKey,
        containerImageTag: 'bastionimage',
        containerConfig: {
          cpu: 256,
          memoryLimitMiB: 512,
        },
        repositoryName: 'bastionrepo',
        ecsTaskExecutionRole: ecsCommon.ecsTaskExecutionRole,
        ecrLifecycleRules: props.bastionEcrLifecycleRules,
      });
      this.bastionApp = bastionApp;
    }
  }
}
