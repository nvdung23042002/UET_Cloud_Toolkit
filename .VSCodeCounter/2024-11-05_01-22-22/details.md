# Details

Date : 2024-11-05 01:22:22

Directory /home/dungnv/work-space/nal/ccb-cdk-codebase

Total : 111 files,  12879 codes, 1391 comments, 864 blanks, all 15134 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [.env](/.env) | Properties | 2 | 0 | 1 | 3 |
| [.eslintrc.json](/.eslintrc.json) | JSON | 11 | 0 | 1 | 12 |
| [.github/workflows/HowToUse-InfraResources.md](/.github/workflows/HowToUse-InfraResources.md) | Markdown | 52 | 0 | 23 | 75 |
| [.github/workflows/HowToUse-maintenance.md](/.github/workflows/HowToUse-maintenance.md) | Markdown | 32 | 0 | 17 | 49 |
| [.github/workflows/InfraResources_ExecutePipeline.yml](/.github/workflows/InfraResources_ExecutePipeline.yml) | YAML | 33 | 0 | 5 | 38 |
| [.github/workflows/InfraResources_RunTest.yml](/.github/workflows/InfraResources_RunTest.yml) | YAML | 21 | 3 | 6 | 30 |
| [.github/workflows/README.md](/.github/workflows/README.md) | Markdown | 56 | 0 | 25 | 81 |
| [.github/workflows/maintenance-off.yml](/.github/workflows/maintenance-off.yml) | YAML | 51 | 5 | 12 | 68 |
| [.github/workflows/maintenance-on.yml](/.github/workflows/maintenance-on.yml) | YAML | 51 | 5 | 12 | 68 |
| [.github/workflows/workflows_template.yml](/.github/workflows/workflows_template.yml) | YAML | 19 | 21 | 10 | 50 |
| [.prettierrc.json](/.prettierrc.json) | JSON | 7 | 0 | 1 | 8 |
| [.versionrc.js](/.versionrc.js) | JavaScript | 11 | 0 | 1 | 12 |
| [README.md](/README.md) | Markdown | 2 | 0 | 2 | 4 |
| [bin/blea-guest-ecsapp-sample.ts](/bin/blea-guest-ecsapp-sample.ts) | TypeScript | 152 | 70 | 32 | 254 |
| [buildspec.yaml](/buildspec.yaml) | YAML | 16 | 4 | 2 | 22 |
| [cdk.json](/cdk.json) | JSON | 6 | 0 | 1 | 7 |
| [container/README.md](/container/README.md) | Markdown | 60 | 0 | 8 | 68 |
| [container/bastion/docker/Dockerfile](/container/bastion/docker/Dockerfile) | Docker | 9 | 1 | 5 | 15 |
| [container/bastion/docker/check_login.sh](/container/bastion/docker/check_login.sh) | Shell Script | 15 | 1 | 3 | 19 |
| [container/bastion/run_task.sh](/container/bastion/run_task.sh) | Shell Script | 54 | 7 | 12 | 73 |
| [container/sample-backend/Dockerfile](/container/sample-backend/Dockerfile) | Docker | 10 | 0 | 8 | 18 |
| [container/sample-backend/app.py](/container/sample-backend/app.py) | Python | 7 | 0 | 4 | 11 |
| [container/sample-backend/build_bg/appspec.yaml](/container/sample-backend/build_bg/appspec.yaml) | YAML | 9 | 0 | 1 | 10 |
| [container/sample-backend/build_bg/build.sh](/container/sample-backend/build_bg/build.sh) | Shell Script | 87 | 14 | 14 | 115 |
| [container/sample-backend/build_bg/dev.conf](/container/sample-backend/build_bg/dev.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-backend/build_bg/prd.conf](/container/sample-backend/build_bg/prd.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-backend/build_bg/stg.conf](/container/sample-backend/build_bg/stg.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-backend/build_bg/taskdef_template.json](/container/sample-backend/build_bg/taskdef_template.json) | JSON | 22 | 0 | 1 | 23 |
| [container/sample-backend/build_ecspresso/autoscale_sample.sh](/container/sample-backend/build_ecspresso/autoscale_sample.sh) | Shell Script | 9 | 1 | 2 | 12 |
| [container/sample-backend/build_ecspresso/build.sh](/container/sample-backend/build_ecspresso/build.sh) | Shell Script | 74 | 14 | 14 | 102 |
| [container/sample-backend/build_ecspresso/dev.conf](/container/sample-backend/build_ecspresso/dev.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-backend/build_ecspresso/ecs-service-def.json](/container/sample-backend/build_ecspresso/ecs-service-def.json) | JSON | 59 | 0 | 1 | 60 |
| [container/sample-backend/build_ecspresso/ecs-task-def.json](/container/sample-backend/build_ecspresso/ecs-task-def.json) | JSON | 36 | 0 | 1 | 37 |
| [container/sample-backend/build_ecspresso/ecspresso.yml](/container/sample-backend/build_ecspresso/ecspresso.yml) | YAML | 6 | 0 | 1 | 7 |
| [container/sample-backend/build_ecspresso/imagedefinitions.json](/container/sample-backend/build_ecspresso/imagedefinitions.json) | JSON | 6 | 0 | 1 | 7 |
| [container/sample-backend/build_ecspresso/prd.conf](/container/sample-backend/build_ecspresso/prd.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-backend/build_ecspresso/stg.conf](/container/sample-backend/build_ecspresso/stg.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-backend/requirements.txt](/container/sample-backend/requirements.txt) | pip requirements | 1 | 0 | 0 | 1 |
| [container/sample-ecs-app/Dockerfile](/container/sample-ecs-app/Dockerfile) | Docker | 1 | 0 | 1 | 2 |
| [container/sample-ecs-app/buildspec.yml](/container/sample-ecs-app/buildspec.yml) | YAML | 17 | 0 | 2 | 19 |
| [container/sample-frontend/Dockerfile](/container/sample-frontend/Dockerfile) | Docker | 5 | 2 | 4 | 11 |
| [container/sample-frontend/build_bg/appspec.yaml](/container/sample-frontend/build_bg/appspec.yaml) | YAML | 9 | 0 | 1 | 10 |
| [container/sample-frontend/build_bg/build.sh](/container/sample-frontend/build_bg/build.sh) | Shell Script | 87 | 14 | 14 | 115 |
| [container/sample-frontend/build_bg/dev.conf](/container/sample-frontend/build_bg/dev.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-frontend/build_bg/prd.conf](/container/sample-frontend/build_bg/prd.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-frontend/build_bg/stg.conf](/container/sample-frontend/build_bg/stg.conf) | Properties | 3 | 1 | 0 | 4 |
| [container/sample-frontend/build_bg/taskdef_template.json](/container/sample-frontend/build_bg/taskdef_template.json) | JSON | 22 | 0 | 1 | 23 |
| [container/sample-frontend/build_ecspresso/autoscale_sample.sh](/container/sample-frontend/build_ecspresso/autoscale_sample.sh) | Shell Script | 9 | 1 | 2 | 12 |
| [container/sample-frontend/build_ecspresso/build.sh](/container/sample-frontend/build_ecspresso/build.sh) | Shell Script | 74 | 16 | 14 | 104 |
| [container/sample-frontend/build_ecspresso/dev.conf](/container/sample-frontend/build_ecspresso/dev.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-frontend/build_ecspresso/ecs-service-def.json](/container/sample-frontend/build_ecspresso/ecs-service-def.json) | JSON | 50 | 0 | 1 | 51 |
| [container/sample-frontend/build_ecspresso/ecs-task-def.json](/container/sample-frontend/build_ecspresso/ecs-task-def.json) | JSON | 36 | 0 | 1 | 37 |
| [container/sample-frontend/build_ecspresso/ecspresso.yml](/container/sample-frontend/build_ecspresso/ecspresso.yml) | YAML | 6 | 0 | 1 | 7 |
| [container/sample-frontend/build_ecspresso/imagedefinitions.json](/container/sample-frontend/build_ecspresso/imagedefinitions.json) | JSON | 6 | 0 | 1 | 7 |
| [container/sample-frontend/build_ecspresso/prd.conf](/container/sample-frontend/build_ecspresso/prd.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-frontend/build_ecspresso/stg.conf](/container/sample-frontend/build_ecspresso/stg.conf) | Properties | 6 | 2 | 1 | 9 |
| [container/sample-frontend/docker-compose.yaml](/container/sample-frontend/docker-compose.yaml) | YAML | 15 | 0 | 3 | 18 |
| [container/sample-frontend/index.html](/container/sample-frontend/index.html) | HTML | 1 | 0 | 1 | 2 |
| [container/sample-frontend/nginx.conf](/container/sample-frontend/nginx.conf) | Properties | 18 | 0 | 3 | 21 |
| [jest.config.js](/jest.config.js) | JavaScript | 7 | 0 | 1 | 8 |
| [lambda/batch-sample-app/index.js](/lambda/batch-sample-app/index.js) | JavaScript | 8 | 0 | 1 | 9 |
| [lib/construct/aurora-constructs/aurora-alarm-construct.ts](/lib/construct/aurora-constructs/aurora-alarm-construct.ts) | TypeScript | 49 | 36 | 8 | 93 |
| [lib/construct/aurora-constructs/aurora-cluster-construct.ts](/lib/construct/aurora-constructs/aurora-cluster-construct.ts) | TypeScript | 86 | 67 | 26 | 179 |
| [lib/construct/aurora-constructs/aurora-mysql-construct.ts](/lib/construct/aurora-constructs/aurora-mysql-construct.ts) | TypeScript | 34 | 3 | 5 | 42 |
| [lib/construct/aurora-constructs/aurora-postgresql-construct.ts](/lib/construct/aurora-constructs/aurora-postgresql-construct.ts) | TypeScript | 33 | 3 | 5 | 41 |
| [lib/construct/aws-managed-prefixlist.ts](/lib/construct/aws-managed-prefixlist.ts) | TypeScript | 35 | 5 | 6 | 46 |
| [lib/construct/chatbot-construct.ts](/lib/construct/chatbot-construct.ts) | TypeScript | 28 | 17 | 5 | 50 |
| [lib/construct/cloudfront-construct.ts](/lib/construct/cloudfront-construct.ts) | TypeScript | 130 | 54 | 17 | 201 |
| [lib/construct/cognito-construct.ts](/lib/construct/cognito-construct.ts) | TypeScript | 52 | 25 | 13 | 90 |
| [lib/construct/dashboard-construct.ts](/lib/construct/dashboard-construct.ts) | TypeScript | 843 | 104 | 19 | 966 |
| [lib/construct/ecs-app-construct/construct/alb-blue-green-construct.ts](/lib/construct/ecs-app-construct/construct/alb-blue-green-construct.ts) | TypeScript | 228 | 57 | 23 | 308 |
| [lib/construct/ecs-app-construct/construct/alb-construct.ts](/lib/construct/ecs-app-construct/construct/alb-construct.ts) | TypeScript | 184 | 38 | 21 | 243 |
| [lib/construct/ecs-app-construct/construct/alb-target-group-construct.ts](/lib/construct/ecs-app-construct/construct/alb-target-group-construct.ts) | TypeScript | 65 | 24 | 8 | 97 |
| [lib/construct/ecs-app-construct/construct/bastion-ecs-construct.ts](/lib/construct/ecs-app-construct/construct/bastion-ecs-construct.ts) | TypeScript | 87 | 32 | 15 | 134 |
| [lib/construct/ecs-app-construct/construct/ecs-app-construct.ts](/lib/construct/ecs-app-construct/construct/ecs-app-construct.ts) | TypeScript | 93 | 38 | 16 | 147 |
| [lib/construct/ecs-app-construct/construct/ecs-common-construct.ts](/lib/construct/ecs-app-construct/construct/ecs-common-construct.ts) | TypeScript | 79 | 21 | 14 | 114 |
| [lib/construct/ecs-app-construct/construct/ecs-service-construct.ts](/lib/construct/ecs-app-construct/construct/ecs-service-construct.ts) | TypeScript | 62 | 46 | 14 | 122 |
| [lib/construct/ecs-app-construct/construct/ecs-task-role-construct.ts](/lib/construct/ecs-app-construct/construct/ecs-task-role-construct.ts) | TypeScript | 48 | 19 | 8 | 75 |
| [lib/construct/ecs-app-construct/construct/pipeline-blue-green-construct.ts](/lib/construct/ecs-app-construct/construct/pipeline-blue-green-construct.ts) | TypeScript | 70 | 18 | 13 | 101 |
| [lib/construct/ecs-app-construct/construct/pipeline-ecspresso-construct.ts](/lib/construct/ecs-app-construct/construct/pipeline-ecspresso-construct.ts) | TypeScript | 176 | 46 | 15 | 237 |
| [lib/construct/ecs-app-construct/index.ts](/lib/construct/ecs-app-construct/index.ts) | TypeScript | 252 | 81 | 23 | 356 |
| [lib/construct/kms-key-construct.ts](/lib/construct/kms-key-construct.ts) | TypeScript | 30 | 2 | 6 | 38 |
| [lib/construct/oidc-iamrole-construct.ts](/lib/construct/oidc-iamrole-construct.ts) | TypeScript | 34 | 12 | 5 | 51 |
| [lib/construct/opensearch-constructs/opensearch-construct.ts](/lib/construct/opensearch-constructs/opensearch-construct.ts) | TypeScript | 54 | 69 | 16 | 139 |
| [lib/construct/opensearch-constructs/opensearch-serverless-construct.ts](/lib/construct/opensearch-constructs/opensearch-serverless-construct.ts) | TypeScript | 60 | 57 | 10 | 127 |
| [lib/construct/sns-construct.ts](/lib/construct/sns-construct.ts) | TypeScript | 32 | 8 | 6 | 46 |
| [lib/construct/vpc-construct.ts](/lib/construct/vpc-construct.ts) | TypeScript | 135 | 25 | 20 | 180 |
| [lib/construct/waf-construct.ts](/lib/construct/waf-construct.ts) | TypeScript | 260 | 98 | 18 | 376 |
| [lib/stack/backup-plan-stack.ts](/lib/stack/backup-plan-stack.ts) | TypeScript | 42 | 0 | 6 | 48 |
| [lib/stack/backup-vault-stack.ts](/lib/stack/backup-vault-stack.ts) | TypeScript | 16 | 0 | 6 | 22 |
| [lib/stack/cloudfront-stack.ts](/lib/stack/cloudfront-stack.ts) | TypeScript | 28 | 0 | 5 | 33 |
| [lib/stack/db-aurora-stack.ts](/lib/stack/db-aurora-stack.ts) | TypeScript | 52 | 4 | 11 | 67 |
| [lib/stack/ecs-app-stack.ts](/lib/stack/ecs-app-stack.ts) | TypeScript | 45 | 0 | 5 | 50 |
| [lib/stack/elasticache-redis-stack.ts](/lib/stack/elasticache-redis-stack.ts) | TypeScript | 107 | 8 | 12 | 127 |
| [lib/stack/monitor-stack.ts](/lib/stack/monitor-stack.ts) | TypeScript | 36 | 2 | 4 | 42 |
| [lib/stack/oidc-stack.ts](/lib/stack/oidc-stack.ts) | TypeScript | 39 | 2 | 5 | 46 |
| [lib/stack/opensearch-stack.ts](/lib/stack/opensearch-stack.ts) | TypeScript | 40 | 12 | 8 | 60 |
| [lib/stack/pipeline-infraresources-stack.ts](/lib/stack/pipeline-infraresources-stack.ts) | TypeScript | 100 | 0 | 12 | 112 |
| [lib/stack/share-resources-stack.ts](/lib/stack/share-resources-stack.ts) | TypeScript | 40 | 2 | 10 | 52 |
| [lib/stack/stepfunctions-sample-stack.ts](/lib/stack/stepfunctions-sample-stack.ts) | TypeScript | 112 | 3 | 13 | 128 |
| [lib/stack/waf-alb-stack.ts](/lib/stack/waf-alb-stack.ts) | TypeScript | 25 | 0 | 6 | 31 |
| [lib/stack/waf-cloudfront-stack.ts](/lib/stack/waf-cloudfront-stack.ts) | TypeScript | 38 | 1 | 5 | 44 |
| [package-lock.json](/package-lock.json) | JSON | 6,491 | 0 | 1 | 6,492 |
| [package.json](/package.json) | JSON | 59 | 0 | 1 | 60 |
| [params/dev.ts](/params/dev.ts) | TypeScript | 204 | 29 | 26 | 259 |
| [params/interface.ts](/params/interface.ts) | TypeScript | 158 | 0 | 20 | 178 |
| [params/prod.ts](/params/prod.ts) | TypeScript | 206 | 57 | 23 | 286 |
| [params/stage.ts](/params/stage.ts) | TypeScript | 206 | 57 | 23 | 286 |
| [test/blea-guest-ecsapp-sample.test.ts](/test/blea-guest-ecsapp-sample.test.ts) | TypeScript | 155 | 12 | 20 | 187 |
| [tsconfig.base.json](/tsconfig.base.json) | JSON | 22 | 0 | 1 | 23 |
| [tsconfig.json](/tsconfig.json) | JSON with Comments | 8 | 0 | 1 | 9 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)