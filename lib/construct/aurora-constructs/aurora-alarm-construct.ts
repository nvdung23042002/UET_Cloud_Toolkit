import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface AuroraAlarmProps {
  /**
   * The Database Cluster.
   */
  readonly cluster: rds.DatabaseCluster;

  /**
   * The SNS topic.
   */
  readonly alarmTopic: sns.Topic;
}

export class AuroraAlarm extends Construct {
  constructor(scope: Construct, id: string, props: AuroraAlarmProps) {
    super(scope, id);

    // Aurora Cluster CPU Utilization
    props.cluster
      .metricCPUUtilization({
        period: cdk.Duration.minutes(1),
        statistic: cw.Stats.AVERAGE,
      })
      .createAlarm(this, 'AuroraCPUUtil', {
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        threshold: 90,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));

    // Can't find instanceIdentifiers - implement later
    //
    // cluster.instanceIdentifiers.forEach(instance => {
    //   console.log("instance: "+instance);
    //   new cw.Metric({
    //     metricName: 'CPUUtilization',
    //     namespace: 'AWS/RDS',
    //      dimensionsMap: {
    //       DBInstanceIdentifier: instance
    //     },
    //     period: cdk.Duration.minutes(1),
    //     statistic: cw.Stats.AVERAGE,
    //   }).createAlarm(this, 'CPUUtilization', {
    //     evaluationPeriods: 3,
    //     datapointsToAlarm: 2,
    //     threshold: 90,
    //     comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
    //     actionsEnabled: true
    //   }).addAlarmAction(new cw_actions.SnsAction(props.alarmTopic));
    // });

    // ----------------------- RDS Event Subscription  -----------------------------
    //   Send critical(see eventCategories) event on all of clusters and instances
    //
    // See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-eventsubscription.html
    // See: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html
    //
    // To specify clusters or instances, add "sourceType (sting)" and "sourceIds (list)"
    // sourceType is one of these - db-instance | db-cluster | db-parameter-group | db-security-group | db-snapshot | db-cluster-snapshot
    //
    new rds.CfnEventSubscription(this, 'RdsEventsCluster', {
      snsTopicArn: props.alarmTopic.topicArn,
      enabled: true,
      sourceType: 'db-cluster',
      eventCategories: ['failure', 'failover', 'maintenance'],
    });

    new rds.CfnEventSubscription(this, 'RdsEventsInstances', {
      snsTopicArn: props.alarmTopic.topicArn,
      enabled: true,
      sourceType: 'db-instance',
      eventCategories: [
        'availability',
        'configuration change',
        'deletion',
        'failover',
        'failure',
        'maintenance',
        'notification',
        'recovery',
      ],
    });
  }
}
