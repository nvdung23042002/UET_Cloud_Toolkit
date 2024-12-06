import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface S3StackProps extends cdk.StackProps {
  bucketName: string; 
}

export class S3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'MyBucket', {
      bucketName: props.bucketName,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      autoDeleteObjects: true, 
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: bucket.bucketArn,
      description: 'The ARN of the S3 bucket',
      exportName: 'MyBucketArn',
    });
  }
}
