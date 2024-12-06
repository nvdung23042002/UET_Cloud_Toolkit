import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { WafConstruct } from '../construct/waf-construct';

export interface WafStackProps extends cdk.StackProps {
  basicAuthUserName?: string;
  basicAuthUserPass?: string;
  scope: string;
  overrideAction_CommonRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_KnownBadInputsRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_AmazonIpReputationList?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_LinuxRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_SQLiRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  overrideAction_CSCRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  ruleAction_IPsetRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
  ruleAction_BasicRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
  allowIPList?: string[];
}

export class WafCfStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const webAcl = new WafConstruct(this, cdk.Stack.of(this).stackName + 'WebAcl', {
      scope: props.scope,
      overrideAction_CommonRuleSet: props.overrideAction_CommonRuleSet,
      overrideAction_KnownBadInputsRuleSet: props.overrideAction_KnownBadInputsRuleSet,
      overrideAction_AmazonIpReputationList: props.overrideAction_AmazonIpReputationList,
      overrideAction_LinuxRuleSet: props.overrideAction_LinuxRuleSet,
      overrideAction_SQLiRuleSet: props.overrideAction_SQLiRuleSet,
      ruleAction_IPsetRuleSet: props.ruleAction_IPsetRuleSet,
      ruleAction_BasicRuleSet: props.ruleAction_BasicRuleSet,
      allowIPList: props.allowIPList,
      basicAuthUserName: props.basicAuthUserName,
      basicAuthUserPass: props.basicAuthUserPass,
      // additionalRules,
    });
    this.webAcl = webAcl.webAcl;
  }
}
