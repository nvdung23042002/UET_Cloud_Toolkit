import os
import subprocess
import sys
import boto3
import botocore
import configparser
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

ssm = boto3.client("ssm")
sts = boto3.client("sts")
ecr = boto3.client("ecr")
s3 = boto3.client("s3")

aws_region = "ap-northeast-1"

script_dir = os.path.dirname(os.path.abspath(__file__))


# シェルコマンド実行
def run_command(command):
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return result.stdout.decode().strip()
    except subprocess.SubprocessError as e:
        sys.exit(f"{e.stderr.decode().strip()}")


# 設定ファイル読み込み
def read_param_file(environment):
    param_file = os.path.join(script_dir, f"{environment}.ini")
    if not os.path.isfile(param_file):
        sys.exit(f"paramuration file '{environment}.ini' not found.")

    param = configparser.ConfigParser()
    param.read(param_file)
    return param


# AWSアカウントIDの設定
def get_aws_account_id():
    print("Setting account ID...")

    try:
        aws_account_id = sts.get_caller_identity()["Account"]
        if len(aws_account_id) == 12 and aws_account_id.isdigit():
            return aws_account_id
        else:
            sys.exit("Invalid AWS AccountID format.")
    except (NoCredentialsError, PartialCredentialsError) as e:
        sys.exit(f"Credentials error: {e}")


# Systems Managerパラメータの取得
def get_ssm_parameter(ssm_name):
    print("Setting Systems parameter...")

    try:
        response = ssm.get_parameter(Name=ssm_name)
        return response["Parameter"]["Value"]
    except (NoCredentialsError, PartialCredentialsError):
        sys.exit("Credentials are not configured properly.")
    except ssm.exceptions.ParameterNotFound:
        sys.exit("Parameter not found.")
    except Exception as e:
        sys.exit(f"Failed to get parameter: {e}")


# Systems Managerパラメータの更新
def update_ssm_parameter(ssm_name, value):
    print("Updating SSM parameter...")

    try:
        ssm.put_parameter(Name=ssm_name, Value=value, Type="String", Overwrite=True)
        print("Update complete")
    except Exception as e:
        sys.exit(f"Failed to update SSM parameter value: {e}")


# ECRへログイン
def login_ecr(aws_account_id):
    print("Logging in to Amazon ECR...")

    try:
        login_command = f"aws ecr get-login-password --region {aws_region} | docker login --username AWS --password-stdin {aws_account_id}.dkr.ecr.{aws_region}.amazonaws.com"
        run_command(login_command)
        print("Login succeeded")
    except Exception as e:
        sys.exit(f"Failed ECR login: {e}")


# Dockerイメージのビルド
def build_docker_image(image_repo_name, image_tag, docker_path):
    print("Building the Docker image...")

    try:
        build_command = (
            f"docker build -t {image_repo_name}:{image_tag} . -f {docker_path}"
        )
        os.chdir(script_dir)
        run_command(build_command)
        print("build complete")
    except Exception as e:
        sys.exit(f"Failed Docker build: {e}")


# Dockerイメージの登録
def push_docker_image(aws_account_id, image_repo_name, image_tag):
    print("Pushing the Docker image...")

    try:
        tag_command = f"docker tag {image_repo_name}:{image_tag} {aws_account_id}.dkr.ecr.{aws_region}.amazonaws.com/{image_repo_name}:{image_tag}"
        push_command = f"docker push {aws_account_id}.dkr.ecr.{aws_region}.amazonaws.com/{image_repo_name}:{image_tag}"
        run_command(tag_command)
        run_command(push_command)
        print("push succeeded")
    except Exception as e:
        sys.exit(f"Failed Docker push: {e}")


# confバケット内のimage.zipの更新
def update_conf_bucket(conf_master_bucket, conf_bucket, zip_name):
    try:
        s3.head_object(Bucket=conf_bucket, Key=zip_name)
        file_exists = True
    except botocore.exceptions.ClientError:
        file_exists = False

    if not file_exists:
        print(
            "image_front.zip does not exist in ConfBucket, so get it from ConfMasterBucket"
        )
        s3.copy_object(
            CopySource={"Bucket": conf_master_bucket, "Key": zip_name},
            Bucket=conf_bucket,
            Key=zip_name,
        )
    else:
        print("image_front.zip already exists in ConfBucket, so relocate image.zip")
        tmp_file = "image_tmp.zip"

        s3.copy_object(
            CopySource={"Bucket": conf_bucket, "Key": zip_name},
            Bucket=conf_bucket,
            Key=tmp_file,
        )
        s3.delete_object(Bucket=conf_bucket, Key=zip_name)

        s3.copy_object(
            CopySource={"Bucket": conf_bucket, "Key": tmp_file},
            Bucket=conf_bucket,
            Key=zip_name,
        )
        s3.delete_object(Bucket=conf_bucket, Key=tmp_file)


def main():
    if len(sys.argv) < 2:
        sys.exit("Please set a argument such as dev/stg/prod")

    environment = sys.argv[1]
    print(f"Your environment is {environment}")

    # 設定ファイル読み込み
    param = read_param_file(environment)

    try:
        env = param["Env"]["ENV"]
        pj_prefix = param["Env"]["PJ_PREFIX"]
        service_prefix = param["Env"]["SERVICE_PREFIX"]
        app_name = param["EcsApp"]["APP_NAME"]
        docker_path = param["Docker"]["FILE_PATH"]
    except KeyError as e:
        print(f"KeyError: The key '{e.args[0]}' is not found")

    aws_account_id = get_aws_account_id()
    print(f"AWS AccountID is {aws_account_id}")

    # ECRのARN取得
    print("Setting ECR ARN...")
    image_repo_name = get_ssm_parameter(
        f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/EcrRepo"
    )
    print(f"ECR Repo is {image_repo_name}")

    # ECRにログイン
    login_ecr(aws_account_id)

    # コミットID最初の7文字をECRタグに設定
    image_tag = run_command("git rev-parse --short=7 HEAD")

    # ECRタグのSSMパラメータの値を更新
    update_ssm_parameter(
        f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/ecrTag", image_tag
    )

    # Dockerイメージのビルド
    build_docker_image(image_repo_name, image_tag, docker_path)

    # Dockerイメージの登録
    push_docker_image(aws_account_id, image_repo_name, image_tag)

    # マスターバケット名の取得
    print("Setting ecspresso conf master Bucket...")
    conf_master_bucket = get_ssm_parameter(
        f"/{env}-{pj_prefix}-common/ConfMasterBucketName"
    )
    print(f"CONF_MASTER_BUCKET is {conf_master_bucket}")

    # confバケット名の取得
    print("Setting ecspresso conf Bucket...")
    conf_bucket = get_ssm_parameter(
        f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/SourceBucketName"
    )
    print(f"CONF_BUCKET is {conf_bucket}")

    # image.zipの更新
    zip_name = "image_front.zip"
    update_conf_bucket(conf_master_bucket, conf_bucket, zip_name)


if __name__ == "__main__":
    main()
