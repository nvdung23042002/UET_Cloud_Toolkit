import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { WafConstruct } from '../construct/waf-construct';

export interface WafAlbStackProps extends cdk.StackProps {
  scope: string;
  allowIPList?: string[];
  preSharedKey?: string;
  associations?: string[];
}

export class WafAlbStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly preSharedKey: string;

  constructor(scope: Construct, id: string, props: WafAlbStackProps) {
    super(scope, id, props);

    const webAcl = new WafConstruct(this, 'WafAlb', {
      scope: props.scope,
      allowIPList: props.allowIPList,
      preSharedKey: props.preSharedKey,
      associations: props.associations
    });

    this.webAcl = webAcl.webAcl;
    this.preSharedKey = webAcl.preSharedKeyValue;
  }
}
