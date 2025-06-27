import { Construct } from "constructs";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";

export interface ClusterRoleProps {
  readonly policyArns?: string[];
}

export class ClusterRole extends Construct {
  public readonly role: Role;

  constructor(scope: Construct, id: string, props: ClusterRoleProps = {}) {
    super(scope, id);
    
    const managedPolicies = (props.policyArns || []).map(arn => 
      ManagedPolicy.fromAwsManagedPolicyName(arn)
    );
    
    // If no policies provided, use the default EKS cluster policy
    if (managedPolicies.length === 0) {
      managedPolicies.push(ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"));
    }

    this.role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("eks.amazonaws.com"),
      managedPolicies,
    });
  }
}
