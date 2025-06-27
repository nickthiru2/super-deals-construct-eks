import { Construct } from "constructs";
import { Cluster } from "aws-cdk-lib/aws-eks";
import { CustomResource, Stack } from "aws-cdk-lib";
import { Provider } from "aws-cdk-lib/custom-resources";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";

export interface KubeConfigGeneratorProps {
  readonly cluster: Cluster;
}

export class KubeConfigGenerator extends Construct {
  constructor(scope: Construct, id: string, props: KubeConfigGeneratorProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, "KubeConfigHandler", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "#src/kube-config/kube-config-handler.ts"),
      handler: "handler",
      initialPolicy: [
        new PolicyStatement({
          actions: ["eks:DescribeCluster"],
          resources: [props.cluster.clusterArn],
        }),
      ],
    });

    const provider = new Provider(this, "KubeConfigProvider", {
      onEventHandler: handler,
    });

    new CustomResource(this, "KubeConfigResource", {
      serviceToken: provider.serviceToken,
      properties: {
        ClusterName: props.cluster.clusterName,
        ClusterArn: props.cluster.clusterArn,
      },
    });
  }
}
