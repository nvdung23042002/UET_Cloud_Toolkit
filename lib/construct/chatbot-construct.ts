import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_chatbot as cb } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';

export interface ChatbotProps extends cdk.StackProps {
  /**
   * AWS Chatbot uses SNS topics to send event and alarm notifications.
   */
  topicArn: string;
  /**
   * Slack Channel ID
   *
   * @example - C01YYYYYYYY
   */
  channelId: string;
  /**
   * Slack Workspace ID
   *
   * @example - TMZU8DSDV
   */
  workspaceId: string;
}

// NOTICE: AWS Chatbot can send events from supported services only.
// See: https://docs.aws.amazon.com/ja_jp/chatbot/latest/adminguide/related-services.html
export class Chatbot extends Construct {
  constructor(scope: Construct, id: string, props: ChatbotProps) {
    super(scope, id);

    // AWS Chatbot configuration for sending message
    const chatbotRole = new iam.Role(this, 'ChatbotRole', {
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
      ],
    });

    // !!! Create SlackChannel and add aws chatbot app to the room
    new cb.CfnSlackChannelConfiguration(this, 'ChatbotChannel', {
      configurationName: `${id}-${props.workspaceId}`,
      slackChannelId: props.channelId,
      iamRoleArn: chatbotRole.roleArn,
      slackWorkspaceId: props.workspaceId,
      snsTopicArns: [props.topicArn],
    });
  }
}
