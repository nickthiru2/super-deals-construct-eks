import { Construct } from "constructs";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";

export interface NodeGroupRoleProps {
  readonly policyArns?: string[];
}

export class NodeGroupRole extends Construct {
  public readonly role: Role;

  constructor(scope: Construct, id: string, props: NodeGroupRoleProps = {}) {
    super(scope, id);
    
    const managedPolicies = (props.policyArns || []).map(arn => 
      ManagedPolicy.fromAwsManagedPolicyName(arn)
    );
    
    // If no policies provided, use the default EKS worker node policies
    if (managedPolicies.length === 0) {
      managedPolicies.push(
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly")
      );
    }

    this.role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies,
    });
  }
}
