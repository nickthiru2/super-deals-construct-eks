import { IVpc } from "aws-cdk-lib/aws-ec2";

/**
 * Properties for configuring the EKS cluster
 */
export interface EksClusterProps {
  /** The VPC where the cluster will be deployed */
  readonly vpc: IVpc;
  /** Cluster name */
  readonly clusterName: string;
  /** Environment name (e.g., 'sandbox', 'staging', 'prod') */
  readonly envName: string;
  /** Subnet IDs for the cluster control plane */
  readonly clusterSubnetIds: string[];
  /** Subnet IDs for worker nodes */
  readonly nodegroupSubnetIds: string[];
  /** Desired number of worker nodes */
  readonly nodegroupDesiredSize?: number;
  /** Minimum number of worker nodes */
  readonly nodegroupMinSize?: number;
  /** Maximum number of worker nodes */
  readonly nodegroupMaxSize?: number;
  /** Disk size in GiB for worker nodes */
  readonly nodegroupDiskSize?: number;
  /** Instance types for worker nodes */
  readonly nodegroupInstanceTypes?: string[];
}
