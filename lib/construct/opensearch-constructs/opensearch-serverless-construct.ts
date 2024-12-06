import * as cdk from 'aws-cdk-lib';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface OpenSearchServerlessProps {
  /**
   * The VPC.
   */
  readonly vpc: ec2.Vpc;

  /**
   * The security group for the OpenSearch domain.
   */
  readonly domainSecurityGroup: ec2.SecurityGroup;

  /**
   * The type of collection.
   *
   * Possible values are `SEARCH` , `TIMESERIES` , and `VECTORSEARCH`.
   */
  readonly collectionType: 'SEARCH' | 'TIMESERIES' | 'VECTORSEARCH';
}

export class OpenSearchServerless extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchServerlessProps) {
    super(scope, id);

    const collection = new opensearchserverless.CfnCollection(this, cdk.Stack.of(this).stackName + 'collection', {
      name: cdk.Stack.of(this).stackName.toLowerCase(),
      type: props.collectionType,
    });
    const vpcEndpoint = new opensearchserverless.CfnVpcEndpoint(
      this,
      cdk.Stack.of(this).stackName.toLowerCase() + 'endpoint',
      {
        name: cdk.Stack.of(this).stackName.toLowerCase(),
        securityGroupIds: [props.domainSecurityGroup.securityGroupId],
        vpcId: props.vpc.vpcId,
        subnetIds: props.vpc.isolatedSubnets.map(({ subnetId }) => subnetId),
      },
    );
    collection.addDependency(vpcEndpoint);

    const netPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      cdk.Stack.of(this).stackName.toLowerCase() + 'netpolicy',
      {
        name: cdk.Stack.of(this).stackName.toLowerCase(),
        type: 'network',
        policy: `[{
          "Rules": [
            { "ResourceType": "collection", "Resource": ["collection/${collection.name}"] },
            { "ResourceType": "dashboard", "Resource": ["collection/${collection.name}"] }
          ],
          "AllowFromPublic": false,
          "SourceVPCEs": ["${vpcEndpoint.attrId}"]
        }]`,
      },
    );
    collection.addDependency(netPolicy);

    const encPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      cdk.Stack.of(this).stackName.toLowerCase() + 'encpolicy',
      {
        name: cdk.Stack.of(this).stackName.toLowerCase(),
        policy: `{"Rules":
        [{
          "ResourceType":"collection",
          "Resource":["collection/${collection.name}"]}],
          "AWSOwnedKey":true}`,
        type: 'encryption',
      },
    );
    collection.addDependency(encPolicy);

    // OpenSearch
    // const rolePolicy = new iam.PolicyStatement({
    //   actions: ["es:ESHttp*",],
    //   resources: [collection.attrArn + '/*'],
    //   effect: iam.Effect.ALLOW,
    // });
    //  IAM
    // const ecsRole = new iam.Role(this, cdk.Stack.of(this).stackName + "ecsRole", {
    //   assumedBy: new iam.ServicePrincipal('ecs.amazonaws.com'),
    // });
    // ecsRole.addToPolicy(rolePolicy);

    // 
    // "aoss:ReadDocument","aoss:WriteDocument","aoss:DeleteIndex",aoss:CreateIndex,aoss:DescribeIndex,aoss:CreateCollectionItems,aoss:DescribeCollectionItems,aoss:DeleteCollectionItems
    // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html#serverless-operations
    //     const accessPolicy = new opensearch.CfnAccessPolicy(this,cdk.Stack.of(this).stackName.toLowerCase() +"accesspolicy",{
    // name属性が必須項目のためconstructoeのidではなくnameにStack名を設定
    //    name: cdk.Stack.of(this).stackName.toLowerCase(),
    //       type:"data",
    //       policy:
    //       `[
    // 	{
    // 		"Rules": [
    // 			{
    // 				"Resource": [
    // 					"index/${collection.name}/*"
    // 				],
    // 				"Permission": [
    // 					"aoss:ReadDocument",
    // 					"aoss:WriteDocument",
    // 					"aoss:DeleteIndex",
    // 					"aoss:CreateIndex",
    // 					"aoss:DescribeIndex",
    // 					"aoss:CreateCollectionItems",
    // 					"aoss:DescribeCollectionItems",
    // 					"aoss:DeleteCollectionItems"
    // 				],
    // 				"ResourceType": "index"
    // 			}
    // 		],
    // 		"Principal": [
    // 			"${ecsRole.roleArn}"
    // 		]
    // 	}
    // ]`
    //     });
    //     collection.addDependency(accessPolicy);
  }
}
