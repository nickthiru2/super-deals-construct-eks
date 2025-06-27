import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import {
  IVpc,
  SecurityGroup,
  SubnetSelection,
  ISubnet,
} from "aws-cdk-lib/aws-ec2";
import { Cluster, KubernetesVersion, EndpointAccess } from "aws-cdk-lib/aws-eks";

// Import using path aliases
import { ClusterRole } from "#src/iam/cluster-role";
import { NodeGroupRole } from "#src/iam/node-role";
import { ClusterSecurityGroup } from "#src/security/security-groups";
import { KubeConfigGenerator } from "#src/kube-config/kube-config";
import { NodeGroupConstruct } from "#src/cluster/node-group";
import { EksCluster } from "#src/cluster/cluster";

// Import types and constants using path aliases
import { EksClusterProps } from "#types/eks-cluster-props";
import {
  DEFAULT_NODE_DISK_SIZE,
  DEFAULT_NODE_DESIRED_SIZE,
  DEFAULT_NODE_MIN_SIZE,
  DEFAULT_NODE_MAX_SIZE,
  DEFAULT_NODE_INSTANCE_TYPES,
} from "#constants/eks-cluster-config";
import { EKS_POLICY_ARNS } from "#constants/eks-iam-policy-arns";
import { DEFAULT_TAGS } from "#constants/default-tags";

// Conditional import for KubectlLayer to handle different CDK versions
let KubectlLayerModule: any;
try {
  // Try AWS CDK v2 style import
  KubectlLayerModule = require("aws-cdk-lib/lambda-layer-kubectl");
} catch (e) {
  try {
    // Fallback to AWS CDK v2 external package
    KubectlLayerModule = require("@aws-cdk/lambda-layer-kubectl-v21");
  } catch (e2) {
    console.warn(
      "Could not import kubectl layer module, EKS cluster creation might fail"
    );
  }
}

/**
 * Properties for creating an EKS cluster
 * @extends EksClusterProps
 */
export interface EksConstructProps extends EksClusterProps {}

/**
 * EKS Construct implementation based on Terraform examples from
 * "Microservices Up and Running" book, Chapter 7 Kubernetes module
 */
export class EksConstruct extends Construct {
  public readonly cluster: Cluster;
  public readonly clusterSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: EksConstructProps) {
    super(scope, id);

    // Apply default values from constants
    const {
      nodegroupDesiredSize = DEFAULT_NODE_DESIRED_SIZE,
      nodegroupMinSize = DEFAULT_NODE_MIN_SIZE,
      nodegroupMaxSize = DEFAULT_NODE_MAX_SIZE,
      nodegroupDiskSize = DEFAULT_NODE_DISK_SIZE,
      nodegroupInstanceTypes = DEFAULT_NODE_INSTANCE_TYPES,
      clusterName,
      vpc,
      clusterSubnetIds,
      nodegroupSubnetIds,
      envName,
    } = props;

    // 1. Create IAM roles with proper policies - like Terraform aws_iam_role resources
    const clusterRole = new ClusterRole(this, "ClusterRole", {
      policyArns: [EKS_POLICY_ARNS.CLUSTER_POLICY],
    });

    const nodeRole = new NodeGroupRole(this, "NodeRole", {
      policyArns: [
        EKS_POLICY_ARNS.WORKER_NODE_POLICY,
        EKS_POLICY_ARNS.CNI_POLICY,
        EKS_POLICY_ARNS.ECR_READ_ONLY,
      ],
    });

    // 2. Create security groups - like Terraform aws_security_group resources
    const securityGroups = new ClusterSecurityGroup(
      this,
      "ClusterSecurityGroup",
      {
        vpc,
        clusterName,
      }
    );

    // Get the correct subnet selection for the cluster - similar to Terraform subnet_ids
    const selectedSubnets = [];
    for (const subnetId of clusterSubnetIds) {
      const subnet = vpc.privateSubnets.find((s) => s.subnetId === subnetId);
      if (subnet) {
        selectedSubnets.push(subnet);
      }
    }
    
    // 3. Create EKS Cluster - like Terraform aws_eks_cluster resource
    const eksCluster = new EksCluster(this, 'EksCluster', {
      clusterName,
      vpc,
      clusterRole: clusterRole.role,
      securityGroup: securityGroups.clusterSecurityGroup,
      subnetSelection: selectedSubnets,
      envName,
      version: KubernetesVersion.V1_21,
      endpointAccess: EndpointAccess.PUBLIC_AND_PRIVATE,
      tags: DEFAULT_TAGS,
    });
    this.cluster = eksCluster.cluster;

    // 4. Add Node Group - similar to Terraform aws_eks_node_group
    const nodeGroup = new NodeGroupConstruct(this, "NodeGroup", {
      cluster: this.cluster,
      nodeRole: nodeRole.role,
      subnetIds: nodegroupSubnetIds,
      desiredSize: nodegroupDesiredSize,
      minSize: nodegroupMinSize,
      maxSize: nodegroupMaxSize,
      diskSize: nodegroupDiskSize,
      instanceTypes: nodegroupInstanceTypes,
      envName,
    });

    // 5. Generate kubeconfig - similar to Terraform local_file resource
    new KubeConfigGenerator(this, "KubeConfig", {
      cluster: this.cluster,
    });

    // 6. Outputs with proper descriptions - similar to Terraform outputs
    new CfnOutput(this, "ClusterName", {
      value: this.cluster.clusterName,
      description: "The name of the EKS cluster",
      exportName: `${clusterName}-name`,
    });

    new CfnOutput(this, "ClusterEndpoint", {
      value: this.cluster.clusterEndpoint,
      description: "The endpoint for the EKS cluster API server",
      exportName: `${clusterName}-endpoint`,
    });

    new CfnOutput(this, "ClusterSecurityGroupId", {
      value: securityGroups.clusterSecurityGroup.securityGroupId,
      description: "The security group ID attached to the EKS cluster",
      exportName: `${clusterName}-security-group`,
    });

    // Store the node group name as an output
    new CfnOutput(this, "NodeGroupName", {
      value: nodeGroup.nodeGroup.nodegroupName || `${clusterName}-nodegroup`,
      description: "The name of the EKS node group",
      exportName: `${clusterName}-nodegroup-name`,
    });
  }
}
