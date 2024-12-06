# How to use ECSPRESSO tool

https://github.com/kayac/ecspresso

## Modify Template

Example template <em>ecs-service-def.json</em>

```console
{
  "capacityProviderStrategy": [
    {
      "base": 0,
      "capacityProvider": "FARGATE",
      "weight": 1
    }
  ],
  "deploymentConfiguration": {
    "deploymentCircuitBreaker": {
      "enable": false,
      "rollback": false
    },
    "maximumPercent": 200,
    "minimumHealthyPercent": 50
  },
  "deploymentController": {
    "type": "ECS"
  },
  "desiredCount": 2,
  "enableECSManagedTags": false,
  "enableExecuteCommand": false,
  "healthCheckGracePeriodSeconds": 60,
  "launchType": "",
  "loadBalancers": [
    {
      "containerName": "EcsApp",

      # when passing value is a number, please use {{ }},
      # this will display error on IDE due to wrong json format
      # but still work because ecspresso will replace value before register task
      "containerPort": {{ must_env `PORT_NUMBER` }},

      # when passing value is a string, please use "{{ }}"
      "targetGroupArn": "{{ must_env `TARGET_GROUP_ARN` }}"

    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "assignPublicIp": "DISABLED",
      "securityGroups": ["{{ must_env `SECURITY_GROUP` }}"],
      "subnets": ["{{ must_env `SUBNET_1` }}", "{{ must_env `SUBNET_2` }}", "{{ must_env `SUBNET_3` }}"]
    }
  },
  "pendingCount": 0,
  "platformFamily": "Linux",
  "platformVersion": "LATEST",
  "propagateTags": "NONE",
  "runningCount": 0,
  "schedulingStrategy": "REPLICA",
  "serviceConnectConfiguration": {
    "enabled": true,
    "namespace": "{{ must_env `NAMESPACE` }}",
    "services": []
  }
}
```
