import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as events from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';

export interface BackupPlanStackProps extends cdk.StackProps {
  vault: backup.BackupVault;
  secondaryVault?: backup.BackupVault;
  backupSchedule: events.Schedule;
  retentionPeriod: Duration;
}

export class BackupPlanStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: BackupPlanStackProps) {
    super(scope, id, props);

    const plan = new backup.BackupPlan(this, cdk.Stack.of(this).stackName);

    if (props.secondaryVault) {
      plan.addRule(
        new backup.BackupPlanRule({
          backupVault: props.vault,
          copyActions: [
            {
              destinationBackupVault: props.secondaryVault,
            },
          ],
          scheduleExpression: props.backupSchedule,
          deleteAfter: props.retentionPeriod,
        }),
      );
    } else {
      plan.addRule(
        new backup.BackupPlanRule({
          backupVault: props.vault,
          scheduleExpression: props.backupSchedule,
          deleteAfter: props.retentionPeriod,
        }),
      );
    }

    plan.addSelection('Selection', {
      resources: [backup.BackupResource.fromTag('AWSBackup', 'True')],
    });
  }
}
