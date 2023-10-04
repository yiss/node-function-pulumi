import { NodeFunction } from "./node-function";
import * as aws from "@pulumi/aws";

import * as pulumi from "@pulumi/pulumi";

// The lambda role that used for executing the lambda function
const lambdaRole = new aws.iam.Role(`lambda-role`, {
  assumeRolePolicy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Effect: "Allow",
        Sid: "",
      },
    ],
  }),
});

// Add the necessary permission needed for the function to run
// Here we follow the least privilege principle where we only give the necessary permission
const lambdaPolicy = new aws.iam.Policy(`lambda-policy`, {
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Resource: "*",
      },
    ],
  }),
});

// We attach the created policy to lambda role
new aws.iam.RolePolicyAttachment(`lambda-role-policy-attachment`, {
  role: lambdaRole.name,
  policyArn: lambdaPolicy.arn.apply((arn) => arn),
});

const lambda = new NodeFunction("my-typescript-function", {
  entry: "src/index.ts",
  handler: "index.handler",
  role: lambdaRole.arn,
});

export const lambdaName = lambda.name;
