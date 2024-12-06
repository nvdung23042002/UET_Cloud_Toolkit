import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as CryptoJS from 'crypto-js';

export interface WafConstructProps {
  /**
   * WAF acl type, accept value CLOUDFRONT | REGIONAL
   */
  scope: string;
  /**
   * Web ACL default action
   *
   * @default - { allow: {} }
   */
  defaultAction?: wafv2.CfnWebACL.DefaultActionProperty;
  /**
   * List IP address will be allowed
   *
   * @example - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-ipset.html#cfn-wafv2-ipset-description
   * @default - undefined will not create rule checking source IP request
   */
  allowIPList?: string[];
  /**
   * Whether to check header x-pre-shared-key or not
   *
   * @default - undefined will not create rule checking header x-pre-shared-key
   */
  preSharedKey?: string;
  /**
   * Whether to setting basic authentication rule with username provided
   *
   * basicAuthUserName and basicAuthUserPass must be defined at the same time
   *
   * @default - undefined will not create rule challenge basic authentication
   */
  basicAuthUserName?: string;
  /**
   * Whether to setting basic authentication rule with username provided
   *
   * basicAuthUserName and basicAuthUserPass must be defined at the same time
   *
   * @default - undefined will not create rule challenge basic authentication
   */
  basicAuthUserPass?: string;
  /**
   * For WAF Regional type, attach Web ACL to list resources
   *
   * @example - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webaclassociation.html#cfn-wafv2-webaclassociation-resourcearn
   * @default - undefined will not attach Web ACL Regional type to any resources
   */
  associations?: string[];
  /**
   * Whether to add more rules to Web ACL, rule priority should be in range [4-99]
   *
   * @default - undefined will not attach additional rules to Web ACL
   */
  additionalRules?: wafv2.CfnWebACL.RuleProperty[];
  /**
   * Whether to add AWS managed rules to Web ACL
   *
   * @default - true, attach list of AWS managed rules to Web ACL
   * AWSManagedRulesCommonRuleSet
   * AWSManagedRulesKnownBadInputsRuleSet
   * AWSManagedRulesAmazonIpReputationList
   * AWSManagedRulesLinuxRuleSet
   * AWSManagedRulesSQLiRuleSet
   */
  isUseAwsManageRules?: boolean;
  /**
   * Override action for AWS managed rule CommonRuleSet
   *
   * @default - { count: {} }
   */
  overrideAction_CommonRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  /**
   * Override action for AWS managed rule KnownBadInputsRuleSet
   *
   * @default - { count: {} }
   */
  overrideAction_KnownBadInputsRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  /**
   * Override action for AWS managed rule AmazonIpReputationList
   *
   * @default - { count: {} }
   */
  overrideAction_AmazonIpReputationList?: wafv2.CfnWebACL.OverrideActionProperty;
  /**
   * Override action for AWS managed rule LinuxRuleSet
   *
   * @default - { count: {} }
   */
  overrideAction_LinuxRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  /**
   * Override action for AWS managed rule SQLiRuleSet
   *
   * @default - { count: {} }
   */
  overrideAction_SQLiRuleSet?: wafv2.CfnWebACL.OverrideActionProperty;
  /**
   * Override action for restrict IP rule
   *
   * @default - { allow: {} }
   */
  ruleAction_IPsetRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
  /**
   * Override action for Basic authentication rule
   *
   * @default - block and respose 401 { name: 'www-authenticate', value: 'Basic' }
   */
  ruleAction_BasicRuleSet?: wafv2.CfnWebACL.RuleActionProperty;
}

export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly preSharedKeyValue: string;

  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    let preSharedKeyRule: wafv2.CfnWebACL.RuleProperty[] = [];
    let IPSetRule: wafv2.CfnWebACL.RuleProperty[] = [];
    let basicAuthRule: wafv2.CfnWebACL.RuleProperty[] = [];
    let awsManagedRules: wafv2.CfnWebACL.RuleProperty[] = [];

    // add additional rules
    const additionalRules: wafv2.CfnWebACL.RuleProperty[] = props.additionalRules ?? [];

    // Allow access from IP list
    if (props.allowIPList) {
      const IPSet = new wafv2.CfnIPSet(this, 'IPset', {
        name: 'IPset',
        ipAddressVersion: 'IPV4',
        scope: props.scope,
        addresses: props.allowIPList,
      });
      IPSetRule = [
        {
          priority: 11,
          action: props.ruleAction_IPsetRuleSet ?? { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'IPset',
          },
          name: 'IPset',
          statement: {
            ipSetReferenceStatement: {
              arn: IPSet.attrArn,
            },
          },
        },
      ];
    }

    // Check header x-pre-shared-key
    if (props.preSharedKey) {
      const preSharedKeyValue = CryptoJS.SHA256(props.preSharedKey).toString().slice(0, 8);
      this.preSharedKeyValue = preSharedKeyValue;

      preSharedKeyRule = [
        {
          priority: 12,
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'IPset',
          },
          name: 'preSharedKey',
          statement: {
            byteMatchStatement: {
              searchString: preSharedKeyValue,
              fieldToMatch: {
                singleHeader: {
                  name: 'x-pre-shared-key',
                },
              },
              positionalConstraint: 'EXACTLY',
              textTransformations: [
                {
                  priority: 0,
                  type: 'NONE',
                },
              ],
            },
          },
        },
      ];
    }

    // Basic authentication rule
    if (props.basicAuthUserName && props.basicAuthUserPass) {
      const plaintext = props.basicAuthUserPass;
      const hash = CryptoJS.SHA256(plaintext).toString();
      const randomString = hash.slice(0, 8);

      const maintenanceUserName = new ssm.CfnParameter(this, 'maintenanceUserName', {
        type: 'String',
        name: `maintenanceUserName-${this.node.addr}`,
        value: props.basicAuthUserName,
      });

      // Basic
      const maintenanceUserPass = new ssm.CfnParameter(this, 'maintenanceUserPass', {
        type: 'String',
        name: `maintenanceUserPass-${this.node.addr}`,
        value: randomString,
      });

      // SSM
      const authToken = maintenanceUserName.value + ':' + maintenanceUserPass.value;
      const BASE64 = Buffer.from(authToken).toString('base64');
      const authString = 'Basic ' + BASE64;

      basicAuthRule = [
        {
          name: 'BasicAuth',
          priority: 13,
          statement: {
            notStatement: {
              statement: {
                byteMatchStatement: {
                  searchString: authString,
                  fieldToMatch: {
                    singleHeader: {
                      name: 'authorization',
                    },
                  },
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE',
                    },
                  ],
                  positionalConstraint: 'EXACTLY',
                },
              },
            },
          },
          action: props.ruleAction_BasicRuleSet ?? {
            block: {
              customResponse: {
                responseCode: 401,
                responseHeaders: [
                  {
                    name: 'www-authenticate',
                    value: 'Basic',
                  },
                ],
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: false,
            metricName: 'BasicAuthRule',
          },
        },
      ];
    }

    // Default rules set using AWS managed rules
    const isUseAwsManageRules = props.isUseAwsManageRules ?? true;
    if (isUseAwsManageRules) {
      awsManagedRules = [
        {
          priority: 1,
          overrideAction: props.overrideAction_CommonRuleSet ?? { count: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesCommonRuleSet',
          },
          name: 'AWSManagedRulesCommonRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
        },
        {
          priority: 2,
          overrideAction: props.overrideAction_KnownBadInputsRuleSet ?? { count: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          },
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
        },
        {
          priority: 3,
          overrideAction: props.overrideAction_AmazonIpReputationList ?? { count: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesAmazonIpReputationList',
          },
          name: 'AWSManagedRulesAmazonIpReputationList',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
        },
        {
          priority: 4,
          overrideAction: props.overrideAction_LinuxRuleSet ?? { count: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesLinuxRuleSet',
          },
          name: 'AWSManagedRulesLinuxRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesLinuxRuleSet',
            },
          },
        },
        {
          priority: 5,
          overrideAction: props.overrideAction_SQLiRuleSet ?? { count: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesSQLiRuleSet',
          },
          name: 'AWSManagedRulesSQLiRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
        },
      ];
    }

    // WebACL
    const webAcl = new wafv2.CfnWebACL(this, `${cdk.Stack.of(this).stackName}WebAcl`, {
      defaultAction: props.defaultAction ?? { allow: {} },
      scope: props.scope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WafAcl',
        sampledRequestsEnabled: true,
      },
      rules: IPSetRule.concat(preSharedKeyRule).concat(basicAuthRule).concat(additionalRules).concat(awsManagedRules),
    });

    this.webAcl = webAcl;

    // Attach WebACL to list resources
    if (props.associations && props.scope == 'REGIONAL') {
      const webAclAssociation = props.associations.map((association, index) => {
        new wafv2.CfnWebACLAssociation(this, `WebAclAssociation-${index}`, {
          resourceArn: association,
          webAclArn: webAcl.attrArn,
        });
      });
    }
  }
}
