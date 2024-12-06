import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { AuroraBaseClusterProps, AuroraCluster } from './aurora-cluster-construct';

export interface AuroraPostgresqlProps extends AuroraBaseClusterProps {
  /**
   * The version of the Aurora Postgresql database.
   */
  readonly dbVersion: rds.AuroraPostgresEngineVersion;
}

export class AuroraPostgresql extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraPostgresqlProps) {
    super(scope, id);

    this.cluster = new AuroraCluster(this, 'AuroraPostgresqlCluster', {
      dbEngine: rds.DatabaseClusterEngine.auroraPostgres({
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
      cloudwatchLogsExports: ['postgresql'],
      enablePerformanceInsights: props.enablePerformanceInsights,
      appServerSecurityGroup: props.appServerSecurityGroup,
      bastionSecurityGroup: props.bastionSecurityGroup,
    }).cluster;
  }
}
