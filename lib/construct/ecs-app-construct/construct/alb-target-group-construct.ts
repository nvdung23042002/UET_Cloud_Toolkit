import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';

export interface AlbtgConstructProps extends cdk.StackProps {
  /**
   * Application Load Balancer's VPC
   */
  myVpc: ec2.Vpc;
  /**
   * SNS topic ARN for sending alarm
   */
  alarmTopic: sns.Topic;
  /**
   * Application Load Balancer listeners
   */
  appAlbListener: elbv2.ApplicationListener;
  /**
   * Application Load Balancer target group port
   */
  targetGroupPort?: number;
  /**
   * Custom path for Application Load Balancer listener rules
   *
   * @default - none
   */
  path?: string;
  /**
   * Priority for Application Load Balancer listener rules
   */
  priority?: number;
}

export class AlbtgConstruct extends Construct {
  public readonly lbForAppTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly albTgUnHealthyHostCountAlarm: cw.Alarm;

  constructor(scope: Construct, id: string, props: AlbtgConstructProps) {
    super(scope, id);

    const lbForAppTargetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup`, {
      targetType: elbv2.TargetType.IP,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: props.targetGroupPort ?? 80,
      deregistrationDelay: cdk.Duration.seconds(30),
      vpc: props.myVpc,
    });
    this.lbForAppTargetGroup = lbForAppTargetGroup;

    if (props.path) {
      props.appAlbListener.addTargetGroups(`${props.path}-AddTarget`, {
        targetGroups: [lbForAppTargetGroup],
        conditions: [elbv2.ListenerCondition.pathPatterns([props.path])],
        priority: props.priority,
      });
    } else {
      // default rule
      props.appAlbListener.addTargetGroups(`AddTarget`, {
        targetGroups: [lbForAppTargetGroup],
      });
    }

    // Alarm for ALB TargetGroup - HealthyHostCount
    lbForAppTargetGroup
      .metrics.healthyHostCount({
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.AVERAGE,
      })
      .createAlarm(this, `AlbTgHealthyHostCount`, {
        evaluationPeriods: 3,
        threshold: 1,
        comparisonOperator: cw.ComparisonOperator.LESS_THAN_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));

    // Alarm for ALB TargetGroup - UnHealthyHostCount
    // This alarm will be used on Dashbaord
    this.albTgUnHealthyHostCountAlarm = lbForAppTargetGroup
      .metrics.unhealthyHostCount({
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.AVERAGE,
      })
      .createAlarm(this, `AlbTgUnHealthyHostCount`, {
        evaluationPeriods: 3,
        threshold: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      });
    this.albTgUnHealthyHostCountAlarm.addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));
  }
}
