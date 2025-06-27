import { Construct } from "constructs";
import { SecurityGroup, IVpc, Port, Peer } from "aws-cdk-lib/aws-ec2";

export interface ClusterSecurityGroupProps {
  readonly vpc: IVpc;
  readonly clusterName: string;
}

export class ClusterSecurityGroup extends Construct {
  public readonly clusterSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: ClusterSecurityGroupProps) {
    super(scope, id);

    // Cluster security group
    this.clusterSecurityGroup = new SecurityGroup(
      this,
      "ClusterSecurityGroup",
      {
        vpc: props.vpc,
        description: `EKS cluster communication with worker nodes for ${props.clusterName}`,
        allowAllOutbound: true,
      }
    );

    // Allow all outbound traffic (as per the Terraform example)
    this.clusterSecurityGroup.addEgressRule(
      Peer.anyIpv4(),
      Port.allTcp(),
      "Allow all outbound traffic"
    );
  }
}
