import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { AuroraBaseClusterProps, AuroraCluster } from './aurora-cluster-construct';

export interface AuroraMysqlProps extends AuroraBaseClusterProps {
  /**
   * The version of the Aurora MySQL database.
   */
  readonly dbVersion: rds.AuroraMysqlEngineVersion;
}

export class AuroraMysql extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraMysqlProps) {
    super(scope, id);

    this.cluster = new AuroraCluster(this, 'AuroraMysqlCluster', {
      dbEngine: rds.DatabaseClusterEngine.auroraMysql({
        version: props.dbVersion,
      }),
      clusterParameters: props.clusterParameters,
      instanceParameters: props.instanceParameters,
      dbName: props.dbName,
      dbUser: props.dbUser,
      auroraMinAcu: props.auroraMinAcu,
      auroraMaxAcu: props.auroraMaxAcu,
      writerInstanceType: props.writerInstanceType,
      readerInstanceType: props.readerInstanceType,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      appKey: props.appKey,
      cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'],
      enablePerformanceInsights: props.enablePerformanceInsights,
      appServerSecurityGroup: props.appServerSecurityGroup,
      bastionSecurityGroup: props.bastionSecurityGroup,
      backtrackWindow: cdk.Duration.days(1),
    }).cluster;
  }
}
