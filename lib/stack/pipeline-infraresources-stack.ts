import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';

export interface InfraResourcesPipelineStackProps extends cdk.StackProps {
  slackChannelName: string;
  slackWorkspaceId: string;
  slackChannelId: string;
  envKey: string;
}

export class InfraResourcesPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraResourcesPipelineStackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, `SourceBucket`, {
      versioned: true,
      eventBridgeEnabled: true,
    });

    const sourceOutput = new codepipeline.Artifact('SourceArtifact');
    const sourceAction = new actions.S3SourceAction({
      actionName: 'SourceBucket',
      bucket: sourceBucket,
      bucketKey: 'image.zip',
      output: sourceOutput,
      trigger: actions.S3Trigger.NONE, // default: S3Trigger.POLL,option: S3Trigger.EVENT
    });

    const pipeline = new codepipeline.Pipeline(this, `Project`);
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    const buildSpec = codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        install: {
          commands: [],
        },
        build: {
          commands: ['npm install', `npx cdk deploy --require-approval never --all -c environment=${props.envKey}`],
        },
      },
    });

    const buildProject = new codebuild.PipelineProject(this, 'buildProject', {
      projectName: `${this.stackName}-BuildProject`, 
      timeout: cdk.Duration.minutes(180),
      buildSpec: buildSpec,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0, 
      },
    });
    if (buildProject.role) {
      buildProject.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: ['arn:aws:iam::*:role/cdk-*'],
        }),
      );

      const buildAction = new actions.CodeBuildAction({
        actionName: 'CodeBuild',
        project: buildProject,
        input: sourceOutput,
        outputs: [new codepipeline.Artifact()],
      });
      pipeline.addStage({
        stageName: 'Build',
        actions: [buildAction],
      });
      new events.Rule(this, 'PipelineTriggerEventRule', {
        eventPattern: {
          account: [cdk.Stack.of(this).account],
          source: ['aws.s3'],
          detailType: ['Object Created'],
          detail: {
            bucket: {
              name: [sourceBucket.bucketName],
            },
            object: {
              key: ['image.zip'],
            },
          },
        },
        targets: [new targets.CodePipeline(pipeline)],
      });

      const target = new chatbot.SlackChannelConfiguration(this, `SlackChannel`, {
        slackChannelConfigurationName: props.slackChannelName,
        slackWorkspaceId: props.slackWorkspaceId,
        slackChannelId: props.slackChannelId,
      });


      buildProject.notifyOnBuildSucceeded('NotifyOnBuildSucceeded', target);
      buildProject.notifyOnBuildFailed('NotifyOnBuildfailed', target);
    }
    new cdk.CfnOutput(this, `SourceBucketName`, { value: sourceBucket.bucketName });
  }
}
