/**
 * IAM policy ARNs used by EKS
 */
export const EKS_POLICY_ARNS = {
  CLUSTER_POLICY: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
  WORKER_NODE_POLICY: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  CNI_POLICY: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  ECR_READ_ONLY: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
};
