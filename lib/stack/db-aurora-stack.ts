import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_rds as rds } from 'aws-cdk-lib';
import { aws_sns as sns } from 'aws-cdk-lib';
import { AuroraBaseClusterProps } from '../construct/aurora-constructs/aurora-cluster-construct';
import { AuroraPostgresql } from '../construct/aurora-constructs/aurora-postgresql-construct';
import { AuroraMysql } from '../construct/aurora-constructs/aurora-mysql-construct';
import { AuroraAlarm } from '../construct/aurora-constructs/aurora-alarm-construct';

export interface DbAuroraStackProps extends cdk.StackProps, AuroraBaseClusterProps {
  dbVersion: rds.AuroraMysqlEngineVersion | rds.AuroraPostgresEngineVersion;
  alarmTopic: sns.Topic;
}

export class DbAuroraStack extends cdk.Stack {
  public readonly dbClusterName: string;

  constructor(scope: Construct, id: string, props: DbAuroraStackProps) {
    super(scope, id, props);

    // ----------------------- Create Cluster -----------------------------

    const auroraClusterSpec: AuroraBaseClusterProps = {
      dbName: props.dbName,
      dbUser: props.dbUser,
      auroraMinAcu: props.auroraMinAcu,
      auroraMaxAcu: props.auroraMaxAcu,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      writerInstanceType: props.writerInstanceType,
      readerInstanceType: props.readerInstanceType,
      appKey: props.appKey,
      enablePerformanceInsights: props.enablePerformanceInsights,
      appServerSecurityGroup: props.appServerSecurityGroup,
      bastionSecurityGroup: props.bastionSecurityGroup,
      clusterParameters: props.clusterParameters,
      instanceParameters: props.instanceParameters,
    };

    let auroraCluster: AuroraPostgresql | AuroraMysql;

    if (props.dbVersion instanceof rds.AuroraPostgresEngineVersion) {
      // PostgreSQL
      auroraCluster = new AuroraPostgresql(this, 'AuroraPostgresqlCluster', {
        dbVersion: props.dbVersion,
        ...auroraClusterSpec,
      });
    } else {
      // MySQL
      auroraCluster = new AuroraMysql(this, 'AuroraMysqlCluster', {
        dbVersion: props.dbVersion,
        ...auroraClusterSpec,
      });
    }

    const cluster = auroraCluster.cluster;
    this.dbClusterName = cluster.clusterIdentifier;

    // ----------------------- Alarms for RDS -----------------------------

    new AuroraAlarm(this, 'AuroraAlarm', {
      cluster,
      alarmTopic: props.alarmTopic,
    });
  }
}
