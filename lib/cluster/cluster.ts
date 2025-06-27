import { Construct } from 'constructs';
import { IVpc, ISubnet } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesVersion, EndpointAccess } from 'aws-cdk-lib/aws-eks';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Tags } from 'aws-cdk-lib';

// Conditional import for KubectlLayer to handle different CDK versions
let KubectlLayerModule: any;
try {
  // Try AWS CDK v2 style import
  KubectlLayerModule = require('aws-cdk-lib/lambda-layer-kubectl');
} catch (e) {
  try {
    // Fallback to AWS CDK v2 external package
    KubectlLayerModule = require('@aws-cdk/lambda-layer-kubectl-v21');
  } catch (e2) {
    console.warn(
      'Could not import kubectl layer module, EKS cluster creation might fail'
    );
  }
}

export interface EksClusterProps {
  /** The name of the cluster */
  readonly clusterName: string;
  /** The VPC to deploy the cluster into */
  readonly vpc: IVpc;
  /** The IAM role for the cluster */
  readonly clusterRole: IRole;
  /** The security group for the cluster */
  readonly securityGroup: SecurityGroup;
  /** The subnets to deploy the cluster into */
  readonly subnetSelection: ISubnet[];
  /** Environment name for tagging */
  readonly envName: string;
  /** Kubernetes version to use */
  readonly version?: KubernetesVersion;
  /** Endpoint access configuration */
  readonly endpointAccess?: EndpointAccess;
  /** Tags to apply to the cluster */
  readonly tags?: { [key: string]: string };
  /** Optional kubectl layer to use */
  readonly kubectlLayer?: ILayerVersion;
}

export class EksCluster extends Construct {
  public readonly cluster: Cluster;

  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id);

    const {
      clusterName,
      vpc,
      clusterRole,
      securityGroup,
      subnetSelection,
      envName,
      version = KubernetesVersion.V1_21,
      endpointAccess = EndpointAccess.PUBLIC_AND_PRIVATE,
      tags = {},
    } = props;

    // Create cluster props with conditional kubectlLayer based on availability
    const clusterProps: any = {
      clusterName,
      version,
      vpc,
      vpcSubnets: { subnets: subnetSelection },
      securityGroup,
      role: clusterRole,
      defaultCapacity: 0, // We'll add our own node group
      endpointAccess,
      tags: {
        ...tags,
        Environment: envName,
        Name: clusterName,
        ManagedBy: 'cdk',
      },
    };

    // Add kubectl layer if available - required in CDK v2
    if (props.kubectlLayer) {
      clusterProps.kubectlLayer = props.kubectlLayer;
    } else if (KubectlLayerModule?.KubectlLayer) {
      clusterProps.kubectlLayer = new KubectlLayerModule.KubectlLayer(
        this,
        'KubectlLayer'
      );
    }

    // Create the EKS cluster
    this.cluster = new Cluster(this, 'EksCluster', clusterProps);

    // Apply tags to the cluster
    Object.entries({
      Environment: envName,
      Name: clusterName,
      ManagedBy: 'cdk',
      ...tags,
    }).forEach(([key, value]) => {
      if (value) {
        Tags.of(this.cluster).add(key, value);
      }
    });
  }
}