import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface AwsManagedPrefixListProps {
  /**
   * Name of the aws managed prefix list.
   * See: https://docs.aws.amazon.com/vpc/latest/userguide/working-with-aws-managed-prefix-lists.html#available-aws-managed-prefix-lists
   * eg. com.amazonaws.global.cloudfront.origin-facing
   */
  readonly prefixlistName: string;
}

export class AwsManagedPrefixList extends Construct {
  public readonly prefixListID: string;

  constructor(scope: Construct, id: string, { prefixlistName }: AwsManagedPrefixListProps) {
    super(scope, id);

    const prefixListId = new AwsCustomResource(this, 'GetPrefixListId', {
      onUpdate: {
        service: '@aws-sdk/client-ec2',
        action: 'DescribeManagedPrefixListsCommand',
        parameters: {
          Filters: [
            {
              Name: 'prefix-list-name',
              Values: [prefixlistName],
            },
          ],
        },
        physicalResourceId: PhysicalResourceId.of(`${id}-${this.node.addr.slice(0, 16)}`),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ec2:DescribeManagedPrefixLists'],
          resources: ['*'],
        }),
      ]),
    }).getResponseField('PrefixLists.0.PrefixListId');

    this.prefixListID = prefixListId;
  }
}
