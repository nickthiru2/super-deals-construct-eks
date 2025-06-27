import { Cluster } from "aws-cdk-lib/aws-eks";

/**
 * Output values from the EKS cluster
 */
export interface EksClusterOutputs {
  /** The EKS cluster object */
  readonly cluster: Cluster;
  /** The security group used by the cluster */
  readonly clusterSecurityGroupId: string;
}
