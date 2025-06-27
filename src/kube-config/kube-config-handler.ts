import { EKSClient, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as fs from 'fs';

/**
 * Custom resource handler to generate kubeconfig for EKS cluster
 */
export async function handler(event: CloudFormationCustomResourceEvent) {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const clusterName = event.ResourceProperties.ClusterName;
    
    if (!clusterName) {
      throw new Error('ClusterName property is required');
    }

    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
      // Create EKS client
      const eksClient = new EKSClient({});
      
      // Get cluster info
      const describeCommand = new DescribeClusterCommand({ name: clusterName });
      const clusterInfo = await eksClient.send(describeCommand);
      
      // Ensure we have a cluster
      if (!clusterInfo.cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }

      // Generate kubeconfig content
      const kubeconfig = generateKubeConfig(clusterInfo.cluster);
      
      // If running in a Lambda environment, we can write to /tmp
      // In a real implementation, you might use S3 or Systems Manager Parameter Store
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        const configPath = '/tmp/kubeconfig';
        fs.writeFileSync(configPath, kubeconfig);
        console.log(`Kubeconfig written to ${configPath}`);
      }

      return {
        PhysicalResourceId: `kubeconfig-${clusterName}`,
        Data: {
          KubeConfigContent: kubeconfig
        }
      };
    }

    // For Delete, just return success
    return {
      PhysicalResourceId: event.PhysicalResourceId
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Generate kubeconfig content for EKS cluster
 */
function generateKubeConfig(cluster: any): string {
  if (!cluster.name || !cluster.endpoint || !cluster.certificateAuthority?.data) {
    throw new Error('Incomplete cluster information');
  }

  return `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: ${cluster.endpoint}
    certificate-authority-data: ${cluster.certificateAuthority.data}
  name: ${cluster.name}
contexts:
- context:
    cluster: ${cluster.name}
    user: aws
  name: ${cluster.name}
current-context: ${cluster.name}
preferences: {}
users:
- name: aws
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
        - --region
        - ${cluster.arn?.split(':')[3] || 'us-east-1'}
        - eks
        - get-token
        - --cluster-name
        - ${cluster.name}
`;
}
