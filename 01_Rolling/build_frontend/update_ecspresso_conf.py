import os
import sys
import boto3
import zipfile
import configparser
import shutil
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

ssm = boto3.client("ssm")
s3 = boto3.client("s3")

script_dir = os.path.dirname(os.path.abspath(__file__))

folder_name = "ecspresso_conf"
zip_file = "image_front.zip"


# 設定ファイル読み込み
def read_param_file(environment):
    param_file = os.path.join(script_dir, f"{environment}.ini")
    if not os.path.isfile(param_file):
        sys.exit(f"Configuration file '{environment}.ini' not found.")

    param = configparser.ConfigParser()
    param.read(param_file)
    return param


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


# image.zipのダウンロード
def download_from_s3(bucket_name):
    print("Downloading from S3...")

    try:
        s3.download_file(bucket_name, zip_file, zip_file)
        with zipfile.ZipFile(zip_file, "r") as zip_ref:
            zip_ref.extractall(folder_name)
        os.remove(zip_file)
        print("Download and extraction complete!")
    except Exception as e:
        sys.exit(f"Download or extraction failed: {e}")


# image.zipのアップロード
def upload_to_s3(bucket_name, source_dir):
    print("Uploading to S3...")

    try:
        shutil.make_archive(zip_file.replace(".zip", ""), "zip", source_dir)
        s3.upload_file(zip_file, bucket_name, zip_file)
        shutil.rmtree(source_dir)
        os.remove(zip_file)
        print("Upload complete!")
    except Exception as e:
        sys.exit(f"Upload failed: {e}")


# タスク定義内のsercert ARNの置換
def replace_secret_arn(source_dir, secret_arn):
    print("Replacing Secret Manager Arn...")

    task_def_path = os.path.join(source_dir, "ecs-task-def.json")

    try:
        with open(task_def_path, "r", encoding="utf-8") as file:
            task_def = file.read()

        task_def = task_def.replace("<SECRET_ARN>", secret_arn)

        with open(task_def_path, "w", encoding="utf-8") as file:
            file.write(task_def)
        print("Secret ARN updated successfully!")
    except Exception as e:
        sys.exit(f"Failed to update Secret ARN: {e}")


def main():
    if len(sys.argv) < 2:
        sys.exit("Please provide an environment argument such as dev/stg/prod.")
    environment = sys.argv[1]
    print(f"Your environment is {environment}")

    param = read_param_file(environment)

    try:
        env = param["Env"]["ENV"]
        pj_prefix = param["Env"]["PJ_PREFIX"]
        service_prefix = param["Env"]["SERVICE_PREFIX"]
        app_name = param["EcsApp"]["APP_NAME"]
    except KeyError as e:
        print(f"KeyError: The key '{e.args[0]}' is not found")

    # S3への操作を選択
    action = input(
        f"\nSelect S3 bucket operation:\n[1] Download {zip_file} from S3 bucket\n[2] Upload {zip_file} to S3 bucket\nEnter number [1 or 2]: "
    ).strip()

    # confバケット名の取得
    bucket_name = get_ssm_parameter(
        f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/SourceBucketName"
    )
    print(f"S3 Bucket is {bucket_name}")

    # Ecspresso confのダウンロード
    if action == "1":
        download_from_s3(bucket_name)

    # Ecspresso confのアップロード
    elif action == "2":
        if (
            input(
                f"\nIs the configuration file '{environment}.ini' updated? [y or n]: "
            )
            .strip()
            .lower()
            == "y"
        ):

            # シークレットARNの取得
            secret_arn = get_ssm_parameter(
                f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/SecretArn"
            )
            print(f"Secret ARN is {secret_arn}")

            # config.py用環境ファイルを追加
            try:
                shutil.copy(
                    os.path.join(script_dir, f"{environment}.ini"),
                    os.path.join(script_dir, f"{folder_name}/param.ini"),
                )
            except FileNotFoundError:
                print(f"Configuration file '{environment}.ini' not found.")
            except PermissionError:
                print("Permission denied while accessing")
            except Exception as e:
                print(f"An error occurred: {e}")

            # シークレットARNの変数を置換
            replace_secret_arn(os.path.join(script_dir, folder_name), secret_arn)

            # 承認フェーズ
            if (
                input("\nType 'Approve' to approve the pipeline execution: ").strip()
                == "Approve"
            ):
                upload_to_s3(bucket_name, os.path.join(script_dir, folder_name))
            else:
                sys.exit("Process aborted.")
        else:
            sys.exit(f"Please update the configuration file '{environment}.ini'.")
    else:
        sys.exit("Invalid choice. Please enter 1 or 2.")


if __name__ == "__main__":
    main()
