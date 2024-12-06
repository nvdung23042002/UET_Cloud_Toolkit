import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { OpenSearch } from '../construct/opensearch-constructs/opensearch-construct';
import { OpenSearchServerless } from '../construct/opensearch-constructs/opensearch-serverless-construct';
import { IOpenSearchParam, IOpenSearchTypeParam } from 'params/interface';
// import * as iam from 'aws-cdk-lib/aws-iam';

export interface OpenSearchStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  appServerSecurityGroup?: ec2.SecurityGroup;
  bastionSecurityGroup?: ec2.SecurityGroup;
  openSearchType: IOpenSearchTypeParam;
  openSearchProps: IOpenSearchParam;
}

export class OpenSearchStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: OpenSearchStackProps) {
    super(scope, id, props);

    const domainsg = new ec2.SecurityGroup(this, 'domainsg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // 1. 
    // ecs security group 

    // Allow app access
    if (props.appServerSecurityGroup) {
      domainsg.connections.allowFrom(props.appServerSecurityGroup, ec2.Port.tcp(443));
    }
    // For Bastion Container
    if (props.bastionSecurityGroup) {
      domainsg.connections.allowFrom(props.bastionSecurityGroup, ec2.Port.tcp(443));
    }

    // 「2. 
    // private subnet
    //  props.myVpc.selectSubnets({ subnets: props.myVpc.privateSubnets }).subnets.forEach((x:ec2.ISubnet) => {
    //     domainsg.addIngressRule(ec2.Peer.ipv4(x.ipv4CidrBlock), ec2.Port.tcp(443));
    //   });

    if (props.openSearchType.openSearchType === 'SERVERLESS') {
      // Create opensearch serverless mode
      new OpenSearchServerless(this, 'OpenSearchServerless', {
        ...props.openSearchProps.openSearchServerlessParam,
        vpc: props.vpc,
        domainSecurityGroup: domainsg,
      });
    } else {
      // Create opensearch provision mode
      new OpenSearch(this, 'OpenSearch', {
        ...props.openSearchProps.openSearchProvisionedParam,
        vpc: props.vpc,
        domainSecurityGroup: domainsg,
      });
    }
  }
}
