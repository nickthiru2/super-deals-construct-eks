import { Construct } from "constructs";
import { CfnNodegroup, Cluster, NodegroupAmiType } from "aws-cdk-lib/aws-eks";
import { IRole } from "aws-cdk-lib/aws-iam";

/**
 * Properties for creating an EKS node group
 */
export interface NodeGroupConstructProps {
  /** The EKS cluster to add the node group to */
  readonly cluster: Cluster;
  
  /** The IAM role to use for the node group */
  readonly nodeRole: IRole;
  
  /** The subnet IDs where the nodes will be launched */
  readonly subnetIds: string[];
  
  /** The desired number of nodes */
  readonly desiredSize?: number;
  
  /** The minimum number of nodes */
  readonly minSize?: number;
  
  /** The maximum number of nodes */
  readonly maxSize?: number;
  
  /** The disk size for each node in GB */
  readonly diskSize?: number;
  
  /** The instance types to use for the node group */
  readonly instanceTypes?: string[];
  
  /** The environment name for tagging */
  readonly envName: string;

  /** The AMI type for the node group */
  readonly amiType?: NodegroupAmiType;
}

/**
 * Construct for an EKS Node Group - matches the Terraform aws_eks_node_group resource
 */
export class NodeGroupConstruct extends Construct {
  /** The CloudFormation Nodegroup resource */
  public readonly nodeGroup: CfnNodegroup;

  constructor(scope: Construct, id: string, props: NodeGroupConstructProps) {
    super(scope, id);

    const nodegroupName = `${props.cluster.clusterName}-nodegroup`;
    
    // Create node group configuration similar to Terraform aws_eks_node_group
    this.nodeGroup = new CfnNodegroup(this, "NodeGroup", {
      clusterName: props.cluster.clusterName,
      nodeRole: props.nodeRole.roleArn,
      subnets: props.subnetIds,
      scalingConfig: {
        desiredSize: props.desiredSize ?? 1,
        minSize: props.minSize ?? 1,
        maxSize: props.maxSize ?? 5,
      },
      diskSize: props.diskSize ?? 20,
      instanceTypes: props.instanceTypes ?? ["t3.medium"],
      amiType: props.amiType ?? NodegroupAmiType.AL2_X86_64,
      nodegroupName,
      // Labels added as key-value pairs for Kubernetes
      labels: {
        "nodegroup-type": "managed",
        "environment": props.envName
      },
      // Tags for AWS resources
      tags: {
        "Environment": props.envName,
        "Name": nodegroupName,
        [`kubernetes.io/cluster/${props.cluster.clusterName}`]: "owned"
      },
      updateConfig: {
        maxUnavailable: 1
      }
    });
  }
}
